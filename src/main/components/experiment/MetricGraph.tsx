import cn from "clsx";
import { D3ZoomEvent, pointer, select, zoom, zoomIdentity } from "d3";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  MetricsTimeSeries,
  MetricsTimeSeriesSamples,
} from "../../../shared/comm";
import { useSize } from "../../hooks/resize";
import { HeatMap } from "./MetricHeatmap";
import { LineChart } from "./MetricLineChart";

import styles from "./MetricGraph.module.css";

const paddingTop = 16;
const paddingRight = 16;
const paddingBottom = 32;
const paddingLeft = 48;

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

  const shadowRoot = useMemo(() => {
    return container?.shadowRoot ?? container?.attachShadow({ mode: "open" });
  }, [container]);

  const portal = useMemo(
    () =>
      shadowRoot &&
      ReactDOM.createPortal(
        series.length === 0 ? null : (
          <ShadowGraph
            series={series}
            samples={samples}
            svgWidth={svgWidth}
            svgHeight={svgHeight}
          />
        ),
        shadowRoot,
      ),
    [shadowRoot, series, samples, svgWidth, svgHeight],
  );

  return (
    <div
      ref={setContainer}
      className={cn(styles["graph"], "text-sm", className)}
    >
      {portal}
    </div>
  );
};

interface ShadowGraphProps {
  series: MetricsTimeSeries[];
  samples: MetricsTimeSeriesSamples[];
  svgWidth: number;
  svgHeight: number;
}

const ShadowGraph: React.FC<ShadowGraphProps> = (props) => {
  const { series, samples, svgWidth, svgHeight } = props;

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

  const isHeatmap = series[0]?.type === "histogram";

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

  const [pointerPos, setPointerPos] = useState<
    readonly [number, number] | null
  >(null);

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
  }, [d3zoom]);

  return (
    <svg ref={svgRef} className="w-full h-full" viewBox={viewBox}>
      <g fill="none" transform={`translate(${paddingLeft}, ${paddingTop})`}>
        {isHeatmap ? (
          <HeatMap
            width={width}
            height={height}
            stats={stats}
            zoom={zoomTransform}
            series={series}
            samples={samples}
            pointer={pointerPos}
          />
        ) : (
          <LineChart
            width={width}
            height={height}
            stats={stats}
            zoom={zoomTransform}
            series={series}
            samples={samples}
            pointer={pointerPos}
          />
        )}
      </g>
    </svg>
  );
};
