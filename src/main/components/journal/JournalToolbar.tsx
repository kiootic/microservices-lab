import cn from "clsx";
import React, { useRef, useState } from "react";
import { useEventCallback } from "../../hooks/event-callback";
import { Journal } from "../../model/journal";
import { Workspace } from "../../model/workspace";

interface JournalToolbarProps {
  className?: string;
  journal: Journal;
  workspace: Workspace;
}

export const JournalToolbar: React.FC<JournalToolbarProps> = (props) => {
  const { className, journal, workspace } = props;

  const inputRef = useRef<HTMLInputElement>(null);

  const [saveName, setSaveName] = useState("");
  const handleSaveNameOnChange = useEventCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSaveName(e.currentTarget.value);
    },
  );

  const save = useEventCallback(() => {
    if (saveName === "") {
      return;
    }

    const state = workspace.getState().getState();
    journal.getState().saveNamed(state, saveName);

    setSaveName("");
    inputRef.current?.blur();
  });

  const handleSaveOnSubmit = useEventCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      save();
    },
  );

  const handleSaveOnClick = useEventCallback(() => {
    if (saveName === "") {
      inputRef.current?.focus();
      return;
    }
    save();
  });

  return (
    <div className={cn("h-10 flex items-center", className)}>
      <form className="flex-1 h-full relative" onSubmit={handleSaveOnSubmit}>
        <button
          type="button"
          className={cn(
            "absolute left-0 w-10 h-10 flex items-center justify-center",
            "outline-none round-focus-ring focus-visible:before:block",
          )}
          onClick={handleSaveOnClick}
        >
          <span className="codicon codicon-save" />
        </button>
        <input
          ref={inputRef}
          className={cn(
            "w-full h-full pl-10 pr-3",
            "bg-transparent",
            "outline-none border-b-2 border-transparent focus-visible:border-primary-400",
          )}
          type="text"
          required
          value={saveName}
          onChange={handleSaveNameOnChange}
        />
      </form>
    </div>
  );
};
