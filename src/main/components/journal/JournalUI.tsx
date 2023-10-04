import cn from "clsx";
import React, { useMemo } from "react";
import { Item, ListBox, Section } from "react-aria-components";
import { useIntl } from "react-intl";
import { useStore } from "zustand";
import { useEventCallback } from "../../hooks/event-callback";
import { Journal, JournalEntryHandle } from "../../model/journal";
import { JournalTimestamp } from "./JournalTimestamp";

interface JournalUIProps {
  className?: string;
  journal: Journal;
  loadJournal?: (handle: JournalEntryHandle) => void;
}

export const JournalUI: React.FC<JournalUIProps> = (props) => {
  const { className, journal, loadJournal } = props;
  const intl = useIntl();

  const sessionJournal = useStore(journal, (j) => j.sessionJournal);
  const namedJournal = useStore(journal, (j) => j.namedJournal);

  const handleOnAction = useEventCallback((key: React.Key) => {
    let handle: JournalEntryHandle | undefined;

    if (typeof key === "string") {
      const [type, id] = key.split(":");
      const journal = type === "session" ? sessionJournal : namedJournal;
      handle = journal.find((h) => h.id === id);
    }

    if (handle != null) {
      loadJournal?.(handle);
    }
  });

  return (
    <div className={cn("overflow-auto", className)}>
      <ListBox
        aria-label={intl.formatMessage({
          id: "views.journal.title",
          defaultMessage: "Journal",
        })}
        onAction={handleOnAction}
      >
        <Section className="border-b-8 border-gray-100">
          {sessionJournal
            .slice()
            .reverse()
            .map((handle, i) => (
              <JournalItem key={handle.id} handle={handle} ordinal={i + 1} />
            ))}
        </Section>
        <Section>
          {namedJournal.map((handle, i) => (
            <JournalItem key={handle.id} handle={handle} ordinal={i + 1} />
          ))}
        </Section>
      </ListBox>
    </div>
  );
};

interface JournalItemProps {
  handle: JournalEntryHandle;
  ordinal: number;
}

const JournalItem: React.FC<JournalItemProps> = (props) => {
  const { handle, ordinal } = props;
  const intl = useIntl();

  const text = useMemo<string>(() => {
    switch (handle.type) {
      case "session":
        return intl.formatMessage(
          {
            id: "views.journal.autosave",
            defaultMessage: "Autosave {ordinal}",
          },
          { ordinal },
        );

      case "named":
        return handle.id;
    }
  }, [intl, handle, ordinal]);

  return (
    <Item
      id={handle.type + ":" + handle.id}
      textValue={text}
      className={cn(
        "flex justify-between px-4 py-2 gap-x-2",
        "cursor-pointer ra-hover:bg-gray-200",
        "outline-none ring-inset ra-focus-visible:ring-1 ra-focus-visible:bg-gray-100",
      )}
    >
      <span className="flex-1 truncate">{text}</span>
      <span className="flex-none text-gray-500" title={handle.updatedAt}>
        <JournalTimestamp value={handle.updatedAt} />
      </span>
    </Item>
  );
};
