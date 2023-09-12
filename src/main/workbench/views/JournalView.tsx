import React from "react";
import cn from "clsx";

interface JournalViewProps {
  className?: string;
}

export const JournalView: React.FC<JournalViewProps> = (props) => {
  const { className } = props;

  return <div className={cn("", className)}>Journal</div>;
};
