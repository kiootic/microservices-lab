import {
  Axis,
  ScaleLinear,
  ZoomTransform,
  axisBottom,
  axisLeft,
  bisectLeft,
  scaleLinear,
  schemeCategory10,
  select,
} from "d3";
import React, { useId, useLayoutEffect, useMemo, useRef } from "react";
import {
  MetricsTimeSeries,
  MetricsTimeSeriesSamples,
} from "../../../shared/comm";
import { formatSeries } from "../../utils/series";
import { formatTimestamp } from "../../utils/timestamp";

interface HeatMapProps {
  width: number;
  height: number;
  stats: SamplesStats;
  series: MetricsTimeSeries[];
  samples: MetricsTimeSeriesSamples[];
  zoom: ZoomTransform;
  pointer: readonly [number, number] | null;
}

interface SamplesStats {
  min: number;
  max: number;
  firstTimestamp: number;
  lastTimestamp: number;
  maxSamples: number;
}

interface SeriesBins {
  max: number;
  bins: SampleBin[];
}

interface SampleBin {
  timestamp: number;
  value: number;
  count: number;
}

export const HeatMap: React.FC<HeatMapProps> = (props) => {
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

  const yTicks = yAxis
    .scale<ScaleLinear<number, number, number>>()
    .ticks(...(yAxis.tickArguments() as number[])).length;
  const [minX, maxX] = xAxis.scale().domain();
  const [minY, maxY] = yAxis.scale().domain();

  const { binSize, numTsBins } = useMemo(() => {
    const periodSeconds = (maxX - minX) / 1000;
    const binSize = calculateBinSize(periodSeconds, width) * 1000;

    const numTsBins =
      binSize === 0 ? 0 : Math.ceil(stats.lastTimestamp / binSize);

    return { binSize, numTsBins };
  }, [width, stats, minX, maxX]);

  const yScale = useMemo(
    () =>
      scaleLinear().domain([minY, maxY]).nice().range([yTicks, 0]).clamp(true),
    [minY, maxY, yTicks],
  );

  const data = useMemo(() => {
    return samples.map(({ timestamps, values }) => {
      const data = new Uint32Array(numTsBins * yTicks);
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        const value = values[i];
        const tsBin = Math.floor(timestamp / binSize);
        if (tsBin < 0 || tsBin >= numTsBins) {
          continue;
        }

        const valueBin = Math.min(Math.floor(yScale(value)), yTicks - 1);
        data[tsBin * yTicks + valueBin]++;
      }

      const bins: SeriesBins = { max: -Infinity, bins: [] };
      for (let tsBin = 0; tsBin < numTsBins; tsBin++) {
        for (let valueBin = 0; valueBin < yTicks; valueBin++) {
          const count = data[tsBin * yTicks + valueBin];
          if (count > bins.max) {
            bins.max = count;
          }
          if (count > 0) {
            bins.bins.push({ timestamp: tsBin, value: valueBin, count });
          }
        }
      }

      return bins;
    });
  }, [binSize, yTicks, numTsBins, samples, yScale]);

  const _pointerBin = useMemo(() => {
    if (pointer == null) {
      return { timestamp: null, value: null };
    }

    const xScale: ScaleLinear<number, number, number> = xAxis.scale();
    const timestamp = xScale.invert(pointer[0]);
    const value = pointer[1];
    if (timestamp < minX || timestamp > maxX) {
      return { timestamp: null, value: null };
    }
    const tsBin = Math.floor(timestamp / binSize);
    const valueBin = Math.floor((value / height) * (yTicks - 1));
    if (valueBin >= yTicks - 1) {
      return { timestamp: null, value: null };
    }
    return { timestamp: tsBin, value: valueBin };
  }, [xAxis, pointer, minX, maxX, binSize, height, yTicks]);

  const pointerBin = useMemo(
    () => ({ timestamp: _pointerBin.timestamp, value: _pointerBin.value }),
    [_pointerBin.timestamp, _pointerBin.value],
  );

  const pointerBins = useMemo<(SampleBin | null)[]>(() => {
    const bins = data.map(
      (bins) =>
        bins.bins.find(
          (b) =>
            b.timestamp === pointerBin.timestamp &&
            b.value === pointerBin.value,
        ) ?? null,
    );
    if (bins.every((b) => b == null)) {
      return [];
    }
    return bins;
  }, [pointerBin, data]);

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
        yTicks={yTicks}
        binSize={binSize}
        data={data}
      />
      <InfoPanel
        width={width}
        height={height}
        xAxis={xAxis}
        yAxis={yAxis}
        yTicks={yTicks}
        binSize={binSize}
        pointer={pointerBin}
        series={series}
        bins={pointerBins}
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
  yTicks: number;
  binSize: number;
  data: SeriesBins[];
}

const Chart: React.FC<ChartProps> = (props) => {
  const { width, height, xAxis, yAxis, yTicks, binSize, data } = props;
  const ref = useRef<SVGGElement | null>(null);

  useLayoutEffect(() => {
    if (ref.current == null) {
      return;
    }

    const xScale: ScaleLinear<number, number, number> = xAxis.scale();
    const cellWidth = xScale(binSize)! - xScale(0)!;
    const cellHeight = height / (yTicks - 1);

    const [start, end] = xScale.domain();
    const startBin = Math.floor(start / binSize);
    const endBin = Math.ceil(end / binSize);

    select(ref.current)
      .selectAll("g.series")
      .data(
        data.map((d) => ({
          ...d,
          bins: d.bins.filter(
            (d) => d.timestamp >= startBin && d.timestamp <= endBin,
          ),
        })),
      )
      .join("g")
      .classed("series", true)
      .attr("fill", (_, i) => schemeCategory10[i])
      .each(function (data) {
        select(this)
          .selectAll("rect")
          .data(data.bins)
          .join("rect")
          .attr("fill-opacity", (d) => quantize(d.count / data.max, 0.05))
          .attr("x", (d) => xScale(d.timestamp * binSize)! + 1)
          .attr("y", (d) => d.value * cellHeight + 1)
          .attr("width", cellWidth - 2)
          .attr("height", cellHeight - 2);
      });
  }, [xAxis, yAxis, data, binSize, yTicks, height]);

  const clipID = useId();

  return (
    <g ref={ref} clipPath={`url(#${clipID})`}>
      <clipPath id={clipID}>
        <rect width={width} height={height} />
      </clipPath>
    </g>
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
      .call((g) => g.select(".domain").remove());
  }, [axis, width]);

  return <g ref={ref} />;
};

interface InfoPanelProps {
  width: number;
  height: number;
  xAxis: Axis<number>;
  yAxis: Axis<number>;
  binSize: number;
  yTicks: number;
  pointer: { timestamp: number | null; value: number | null };
  series: MetricsTimeSeries[];
  bins: (SampleBin | null)[];
}

const InfoPanel: React.FC<InfoPanelProps> = (props) => {
  const {
    width,
    height,
    xAxis,
    yAxis,
    binSize,
    yTicks,
    pointer,
    series,
    bins,
  } = props;
  const ref = useRef<SVGGElement | null>(null);

  const xScale: ScaleLinear<number, number, number> = xAxis.scale();
  const yScale: ScaleLinear<number, number, number> = yAxis.scale();
  const cellWidth = xScale(binSize)! - xScale(0)!;
  const cellHeight = height / (yTicks - 1);

  useLayoutEffect(() => {
    if (ref.current == null) {
      return;
    }

    const seriesBins = bins.flatMap((bin, i) => {
      if (bin == null) {
        return [];
      }
      return { bin, index: i, series: series[i] };
    });

    const svg = select(ref.current);
    if (
      pointer.timestamp == null ||
      pointer.value == null ||
      seriesBins.length === 0
    ) {
      svg.style("display", "none");
      return;
    }
    svg.style("display", null);

    const indicatorX = xScale(pointer.timestamp * binSize)!;
    svg
      .selectAll("rect.indicator")
      .data([0])
      .join("rect")
      .classed("indicator", true)
      .attr("stroke", "currentColor")
      .attr("x", indicatorX)
      .attr("y", pointer.value * cellHeight)
      .attr("width", Math.min(indicatorX + cellWidth, width) - indicatorX)
      .attr("height", cellHeight);

    const panel = svg
      .selectAll("g.panel")
      .data([0])
      .join("g")
      .classed("panel", true);

    panel
      .selectAll("text.bin")
      .data([0])
      .join("text")
      .classed("bin", true)
      .attr("font-family", "var(--mono-font)")
      .attr("font-size", 12)
      .attr("fill", "currentColor")
      .selectAll("tspan")
      .data([
        [
          formatTimestamp(pointer.timestamp * binSize),
          formatTimestamp(pointer.timestamp * binSize + binSize),
        ].join(" - "),
        [
          Math.round(yScale.invert(pointer.value * cellHeight + cellHeight)),
          Math.round(yScale.invert(pointer.value * cellHeight)),
        ].join(" - "),
      ])
      .join("tspan")
      .attr("dx", 16)
      .text((d) => d);

    panel
      .selectAll("g.series")
      .data(seriesBins)
      .join("g")
      .classed("series", true)
      .each(function ({ bin, index, series }, i) {
        const seriesPanel = select(this).attr(
          "transform",
          `translate(0, ${i * 16 + 16})`,
        );

        seriesPanel
          .selectAll("rect.color")
          .data([0])
          .join("rect")
          .classed("color", true)
          .attr("x", 4)
          .attr("y", -10)
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", schemeCategory10[index]);

        seriesPanel
          .selectAll("text")
          .data([0])
          .join("text")
          .attr("font-family", "var(--mono-font)")
          .attr("font-size", 12)
          .attr("fill", "currentColor")
          .attr("x", 4)
          .attr("y", 0)
          .selectAll("tspan")
          .data([formatSeries(series), bin.count.toString()])
          .join("tspan")
          .attr("dx", 16)
          .attr("font-weight", (_, i) => (i === 0 ? "bold" : ""))
          .text((d) => d);
      });
  }, [
    xScale,
    yScale,
    width,
    height,
    binSize,
    cellHeight,
    cellWidth,
    pointer,
    series,
    bins,
  ]);

  return <g ref={ref} />;
};

const binSizes = [
  0.1,
  0.25,
  0.5,
  1,
  2,
  5,
  10,
  15,
  30,
  60,
  2 * 60,
  5 * 60,
  10 * 60,
  15 * 60,
  30 * 60,
  60 * 60,
];

function calculateBinSize(periodSeconds: number, width: number) {
  return binSizes[bisectLeft(binSizes, (periodSeconds / width) * 8)];
}

function quantize(value: number, quantum: number) {
  return Math.ceil(value / quantum) * quantum;
}
