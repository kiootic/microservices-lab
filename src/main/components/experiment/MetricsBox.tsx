import React from "react";
import cn from "clsx";
import { MetricView } from "./MetricView";

interface MetricsBoxProps {
  className?: string;
}

export const MetricsBox: React.FC<MetricsBoxProps> = (props) => {
  const { className } = props;

  return (
    <div className={cn("overflow-auto", className)}>
      <MetricView />
    </div>
  );
};
