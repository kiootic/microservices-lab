import React from "react";
import cn from "clsx";

interface ExperimentViewProps {
  className?: string;
}

export const ExperimentView: React.FC<ExperimentViewProps> = (props) => {
  const { className } = props;

  return <div className={cn("", className)}>Experiment</div>;
};
