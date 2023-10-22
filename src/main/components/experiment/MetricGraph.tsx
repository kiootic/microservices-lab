import cn from "clsx";
import {
  Axis,
  D3ZoomEvent,
  ScaleLinear,
  ZoomTransform,
  axisBottom,
  axisLeft,
  bisectCenter,
  line,
  pointer,
  scaleLinear,
  schemeCategory10,
  select,
  zoom,
  zoomIdentity,
} from "d3";
import { LTTB } from "downsample";
import React, {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MetricsTimeSeries,
  MetricsTimeSeriesSamples,
} from "../../../shared/comm";
import { useSize } from "../../hooks/resize";
import { formatTimestamp } from "../../utils/timestamp";

const paddingTop = 16;
const paddingRight = 16;
const paddingBottom = 32;
const paddingLeft = 48;

interface InfoTarget {
  index: number;
  series: MetricsTimeSeries;
  timestamp: number;
  value: number;
  x: number;
  y: number;
}

interface MetricGraphProps {
  className?: string;
  series: MetricsTimeSeries[];
  samples: MetricsTimeSeriesSamples[];
}

export const MetricGraph: React.FC<MetricGraphProps> = (props) => {
  const { className, series, samples } = props;

  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const size = useSize(container, (width, height) => ({ width, height }));
  const svgWidth = size?.width ?? 256;
  const svgHeight = size?.height ?? 128;
  const viewBox = `0 0 ${svgWidth} ${svgHeight}`;
  const width = svgWidth - paddingLeft - paddingRight;
  const height = svgHeight - paddingTop - paddingBottom;

  const stats = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let firstTimestamp = Infinity;
    let lastTimestamp = -Infinity;
    let maxSamples = 0;
    for (const s of series) {
      min = Math.min(min, s.min);
      max = Math.max(max, s.max);
      firstTimestamp = Math.min(firstTimestamp, s.firstTimestamp);
      lastTimestamp = Math.max(lastTimestamp, s.lastTimestamp);
      maxSamples = Math.max(maxSamples, s.numSamples);
    }
    return { min, max, firstTimestamp, lastTimestamp, maxSamples };
  }, [series]);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const [zoomTransform, setZoomTransform] = useState(zoomIdentity);
  const d3zoom = useMemo(() => {
    const extent: [[number, number], [number, number]] = [
      [0, 0],
      [width, height],
    ];

    return zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, (stats.maxSamples / width) * 8])
      .translateExtent(extent)
      .extent(extent);
  }, [width, height, stats]);

  const layout = useMemo(() => {
    const xRange = [0, width];
    const xScale = zoomTransform.rescaleX(
      scaleLinear()
        .domain([stats.firstTimestamp, stats.lastTimestamp])
        .range(xRange),
    );
    const xAxis = axisBottom<number>(xScale)
      .tickSizeOuter(0)
      .ticks(width / 64)
      .tickFormat((value) => formatTimestamp(value.valueOf(), "compact"));

    const yScale = scaleLinear()
      .domain([stats.min, stats.max])
      .nice()
      .range([height, 0]);
    const yAxis = axisLeft<number>(yScale)
      .tickSizeOuter(0)
      .ticks(height / 16);

    return { xAxis, yAxis };
  }, [width, height, stats, zoomTransform]);

  const [pointerPos, setPointerPos] = useState<
    readonly [number, number] | null
  >(null);

  const timestamp = useMemo(() => {
    if (pointerPos == null) {
      return null;
    }

    const scale: ScaleLinear<number, number, number> = layout.xAxis.scale();
    const timestamp = scale.invert(pointerPos[0]);
    const [firstTimestamp, lastTimestamp] = scale.domain();
    if (timestamp < firstTimestamp || timestamp > lastTimestamp) {
      return null;
    }
    return timestamp;
  }, [layout, pointerPos]);

  const infoTarget = useMemo<InfoTarget | null>(() => {
    if (timestamp == null || pointerPos == null) {
      return null;
    }

    const pointerSamples = samples.map(({ timestamps, values }) => {
      const i = bisectCenter(timestamps, timestamp);
      return [timestamps[i], values[i]];
    });
    const samplePoints = pointerSamples.map(([timestamp, value]) => {
      const x = layout.xAxis.scale()(timestamp)!;
      const y = layout.yAxis.scale()(value)!;
      return [x, y];
    });

    let minDist = Infinity;
    let seriesIndex = -1;
    for (let i = 0; i < samplePoints.length; i++) {
      const [x, y] = samplePoints[i];
      const dx = x - pointerPos[0];
      const dy = y - pointerPos[1];
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < minDist) {
        minDist = distanceSquared;
        seriesIndex = i;
      }
    }

    if (seriesIndex === -1) {
      return null;
    }
    return {
      index: seriesIndex,
      series: series[seriesIndex],
      timestamp: pointerSamples[seriesIndex][0],
      value: pointerSamples[seriesIndex][1],
      x: samplePoints[seriesIndex][0],
      y: samplePoints[seriesIndex][1],
    };
  }, [timestamp, pointerPos, layout, series, samples]);

  useLayoutEffect(() => {
    if (svgRef.current == null) {
      return;
    }

    const svg = select(svgRef.current);
    svg.call(d3zoom);

    d3zoom.on("zoom", (e: D3ZoomEvent<SVGSVGElement, unknown>) => {
      setZoomTransform(e.transform);
      if (!("touches" in e.sourceEvent)) {
        const [x, y] = pointer(e.sourceEvent, svg.node());
        setPointerPos([x - paddingLeft, y - paddingTop]);
      }
    });

    svg.on("pointermove", (event: PointerEvent) => {
      const [x, y] = pointer(event, svg.node());
      setPointerPos([x - paddingLeft, y - paddingTop]);
    });

    svg.on("pointerdown", (event: PointerEvent) => {
      const [x, y] = pointer(event, svg.node());
      setPointerPos([x - paddingLeft, y - paddingTop]);
    });

    svg.on("pointerleave", () => {
      setPointerPos(null);
    });
  }, [layout, d3zoom]);

  return (
    <div ref={setContainer} className={cn("text-sm", className)}>
      {series.length === 0 ? null : (
        <svg ref={svgRef} className="w-full h-full" viewBox={viewBox}>
          <g fill="none" transform={`translate(${paddingLeft}, ${paddingTop})`}>
            <XAxis height={height} axis={layout.xAxis} />
            <YAxis width={width} axis={layout.yAxis} />
            <Chart
              width={width}
              height={height}
              xAxis={layout.xAxis}
              yAxis={layout.yAxis}
              zoom={zoomTransform}
              samples={samples}
              target={infoTarget}
            />
            <InfoPanel
              height={height}
              xAxis={layout.xAxis}
              timestamp={timestamp}
              target={infoTarget}
            />
          </g>
        </svg>
      )}
    </div>
  );
};

interface XAxisProps {
  height: number;
  axis: Axis<number>;
}

const XAxis: React.FC<XAxisProps> = (props) => {
  const { height, axis } = props;
  const ref = useRef<SVGGElement | null>(null);

  useLayoutEffect(() => {
    if (ref.current == null) {
      return;
    }

    select(ref.current).call(axis);
  }, [axis]);

  return <g ref={ref} transform={`translate(0, ${height})`} />;
};

interface YAxisProps {
  width: number;
  axis: Axis<number>;
}

const YAxis: React.FC<YAxisProps> = (props) => {
  const { width, axis } = props;
  const ref = useRef<SVGGElement | null>(null);

  useLayoutEffect(() => {
    if (ref.current == null) {
      return;
    }

    select(ref.current)
      .call(axis)
      .call((g) => {
        const gridLines = g
          .selectAll<SVGGElement, unknown>(".tick")
          .selectAll<SVGLineElement, unknown>("line.grid-line")
          .data([0]);

        gridLines
          .enter()
          .append("line")
          .merge(gridLines)
          .classed("grid-line", true)
          .attr("stroke", "currentColor")
          .attr("stroke-opacity", 0.2)
          .attr("stroke-width", 1)
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", width)
          .attr("y2", 0);
      })
      .call((g) => g.select(".domain").remove());
  }, [axis, width]);

  return <g ref={ref} />;
};

interface ChartProps {
  width: number;
  height: number;
  xAxis: Axis<number>;
  yAxis: Axis<number>;
  zoom: ZoomTransform;
  samples: MetricsTimeSeriesSamples[];
  target: InfoTarget | null;
}

const Chart: React.FC<ChartProps> = (props) => {
  const { width, height, xAxis, yAxis, zoom, samples, target } = props;
  const ref = useRef<SVGGElement | null>(null);

  const { numBins, firstTimestamp, lastTimestamp } = useMemo(() => {
    const resolutionLevel = Math.pow(2, Math.floor(Math.log2(zoom.k)));
    const xScale = xAxis.scale();
    const numBins = resolutionLevel * (xScale.range()[1] - xScale.range()[0]);
    const [firstTimestamp, lastTimestamp] = xScale.domain().map(Number);
    return { numBins, firstTimestamp, lastTimestamp };
  }, [xAxis, zoom]);

  const points = useMemo(
    () =>
      samples.map(({ timestamps, values }) => {
        const points: Array<[number, number]> = [];
        for (let i = 0; i < timestamps.length; i++) {
          points.push([timestamps[i], values[i]]);
        }
        return Array.from(LTTB(points, numBins)) as Array<[number, number]>;
      }),
    [samples, numBins],
  );

  const data = useMemo(
    () =>
      points.map((pts) => {
        const points: Array<[number, number]> = [];
        for (let i = 0; i < pts.length; i++) {
          if (pts[i][0] < firstTimestamp) {
            continue;
          }
          if (pts[i][0] > lastTimestamp) {
            points.push(pts[i]);
            break;
          }

          if (points.length === 0 && i > 0) {
            points.push(pts[i - 1]);
          }
          points.push(pts[i]);
        }
        return points;
      }),
    [points, firstTimestamp, lastTimestamp],
  );

  useLayoutEffect(() => {
    if (ref.current == null) {
      return;
    }

    const xScale = xAxis.scale();
    const yScale = yAxis.scale();

    select(ref.current)
      .selectAll("path")
      .data(data)
      .join("path")
      .attr("stroke", (_, i) => schemeCategory10[i])
      .attr("stroke-opacity", (_, i) =>
        target == null || target.index === i ? 1 : 0.4,
      )
      .attr(
        "d",
        line()
          .x((d) => xScale(d[0])!)
          .y((d) => yScale(d[1])!),
      );
  }, [xAxis, yAxis, data, target]);

  const clipID = useId();

  return (
    <g
      ref={ref}
      strokeWidth={1.5}
      strokeLinejoin="round"
      strokeLinecap="round"
      clipPath={`url(#${clipID})`}
    >
      <clipPath id={clipID}>
        <rect width={width} height={height} />
      </clipPath>
    </g>
  );
};

interface InfoPanelProps {
  height: number;
  xAxis: Axis<number>;
  timestamp: number | null;
  target: InfoTarget | null;
}

const InfoPanel: React.FC<InfoPanelProps> = (props) => {
  const { height, xAxis, timestamp, target } = props;
  const ref = useRef<SVGGElement | null>(null);

  useLayoutEffect(() => {
    if (ref.current == null) {
      return;
    }

    const svg = select(ref.current);
    if (timestamp == null) {
      svg.attr("hidden", true);
      return;
    }
    svg.attr("hidden", null);

    const timestampLine = svg
      .selectAll("line.timestamp-line")
      .data([0])
      .join("line")
      .classed("timestamp-line", true)
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "2 2")
      .attr("y1", 0)
      .attr("y2", height);

    const x = xAxis.scale()(timestamp)!;
    timestampLine.attr("x1", x).attr("x2", x);

    const indicator = svg
      .selectAll("circle.indicator")
      .data([0])
      .join("circle")
      .classed("indicator", true)
      .attr("stroke", "currentColor")
      .attr("fill", "white")
      .attr("r", 3);

    const panel = svg
      .selectAll("g.panel")
      .data([0])
      .join("g")
      .classed("panel", true);
    const panelColorRect = panel
      .selectAll("rect.color")
      .data([0])
      .join("rect")
      .classed("color", true)
      .attr("x", 4)
      .attr("y", -14)
      .attr("width", 12)
      .attr("height", 12);
    const panelText = panel
      .selectAll("text")
      .data([0])
      .join("text")
      .classed("font-mono", true)
      .attr("font-size", 12)
      .attr("fill", "currentColor")
      .attr("x", 4)
      .attr("y", -4);

    if (target != null) {
      indicator.attr("hidden", null).attr("cx", target.x).attr("cy", target.y);

      panel.attr("hidden", null);
      panelText
        .selectAll("tspan")
        .data([
          formatSeries(target.series),
          formatTimestamp(target.timestamp),
          target.value.toString(),
        ])
        .join("tspan")
        .attr("dx", 16)
        .attr("font-weight", (_, i) => (i === 0 ? "bold" : ""))
        .text((d) => d);
      panelColorRect.attr("fill", schemeCategory10[target.index]);
    } else {
      indicator.attr("hidden", true);
      panel.attr("hidden", true);
    }
  }, [timestamp, xAxis, height, target]);

  return <g ref={ref} />;
};

function formatSeries(series: MetricsTimeSeries): string {
  let text = series.name;
  const labels = Object.entries(series.labels)
    .map(([name, value]) => `${name}=${value}`)
    .join(", ");
  if (labels.length > 0) {
    text += `{${labels}}`;
  }
  return text;
}
