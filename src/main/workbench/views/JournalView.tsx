import React from "react";
import { JournalUI } from "../../components/journal/JournalUI";
import { useWorkbenchContext } from "../context";

interface JournalViewProps {
  className?: string;
}

export const JournalView: React.FC<JournalViewProps> = (props) => {
  const { className } = props;
  const { journal, workspace, loadJournal } = useWorkbenchContext();
  return (
    <JournalUI
      className={className}
      journal={journal}
      workspace={workspace}
      loadJournal={loadJournal}
    />
  );
};
