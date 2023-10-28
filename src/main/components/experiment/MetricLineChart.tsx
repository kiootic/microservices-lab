import {
  Axis,
  ScaleLinear,
  ZoomTransform,
  axisBottom,
  axisLeft,
  bisectCenter,
  line,
  scaleLinear,
  schemeCategory10,
  select,
} from "d3";
import { LTTB } from "downsample";
import React, { useId, useLayoutEffect, useMemo, useRef } from "react";
import {
  MetricsTimeSeries,
  MetricsTimeSeriesSamples,
} from "../../../shared/comm";
import { formatTimestamp } from "../../utils/timestamp";
import { formatSeries } from "../../utils/series";

interface LineChartProps {
  width: number;
  height: number;
  stats: SamplesStats;
  series: MetricsTimeSeries[];
  samples: MetricsTimeSeriesSamples[];
  zoom: ZoomTransform;
  pointer: readonly [number, number] | null;
}

interface InfoTarget {
  index: number;
  series: MetricsTimeSeries;
  timestamp: number;
  value: number;
  x: number;
  y: number;
}

interface SamplesStats {
  min: number;
  max: number;
  firstTimestamp: number;
  lastTimestamp: number;
  maxSamples: number;
}

export const LineChart: React.FC<LineChartProps> = (props) => {
  const { width, height, stats, series, samples, zoom, pointer } = props;

  const { xAxis, yAxis } = useMemo(() => {
    const xRange = [0, width];
    const xScale = zoom.rescaleX(
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
  }, [width, height, stats, zoom]);

  const timestamp = useMemo(() => {
    if (pointer == null) {
      return null;
    }

    const scale: ScaleLinear<number, number, number> = xAxis.scale();
    const timestamp = scale.invert(pointer[0]);
    const [firstTimestamp, lastTimestamp] = scale.domain();
    if (timestamp < firstTimestamp || timestamp > lastTimestamp) {
      return null;
    }
    return timestamp;
  }, [xAxis, pointer]);

  const infoTarget = useMemo<InfoTarget | null>(() => {
    if (timestamp == null || pointer == null) {
      return null;
    }

    const pointerSamples = samples.map(({ timestamps, values }) => {
      const i = bisectCenter(timestamps, timestamp);
      return [timestamps[i], values[i]];
    });
    const samplePoints = pointerSamples.map(([timestamp, value]) => {
      const x = xAxis.scale()(timestamp)!;
      const y = yAxis.scale()(value)!;
      return [x, y];
    });

    let minDist = Infinity;
    let seriesIndex = -1;
    for (let i = 0; i < samplePoints.length; i++) {
      const [x, y] = samplePoints[i];
      const dx = x - pointer[0];
      const dy = y - pointer[1];
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
  }, [timestamp, pointer, xAxis, yAxis, series, samples]);

  return (
    <g>
      <XAxis height={height} axis={xAxis} />
      <YAxis width={width} axis={yAxis} />
      <Chart
        width={width}
        height={height}
        xAxis={xAxis}
        yAxis={yAxis}
        zoom={zoom}
        samples={samples}
        target={infoTarget}
      />
      <InfoPanel
        height={height}
        xAxis={xAxis}
        timestamp={timestamp}
        target={infoTarget}
      />
    </g>
  );
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
    const resolutionLevel = Math.pow(2, Math.floor(Math.log2(zoom.k)) - 1);
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
      svg.style("display", "none");
      return;
    }
    svg.style("display", null);

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
      .attr("font-family", "var(--mono-font)")
      .attr("font-size", 12)
      .attr("fill", "currentColor")
      .attr("x", 4)
      .attr("y", -4);

    if (target != null) {
      indicator
        .style("display", null)
        .attr("cx", target.x)
        .attr("cy", target.y);

      panel.style("display", null);
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
      indicator.style("display", "hidden");
      panel.style("display", "hidden");
    }
  }, [timestamp, xAxis, height, target]);

  return <g ref={ref} />;
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
