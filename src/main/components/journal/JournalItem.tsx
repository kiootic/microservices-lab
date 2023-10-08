import cn from "clsx";
import React, { useMemo } from "react";
import { Button, Item } from "react-aria-components";
import { useIntl } from "react-intl";
import { JournalEntryHandle } from "../../model/journal";
import { JournalTimestamp } from "./JournalTimestamp";
import styles from "./JournalItem.module.css";
import { useEventCallback } from "../../hooks/event-callback";

interface JournalItemProps {
  handle: JournalEntryHandle;
  ordinal: number;
  onDelete: (handle: JournalEntryHandle) => void;
}

export const JournalItem: React.FC<JournalItemProps> = (props) => {
  const { handle, ordinal, onDelete } = props;
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

  const handleDeleteOnClick = useEventCallback(() => {
    onDelete(handle);
  });

  return (
    <Item
      id={handle.type + ":" + handle.id}
      textValue={text}
      className={cn(
        styles["item"],
        "cursor-pointer ra-hover:bg-gray-200",
        "outline-none ring-inset ra-focus-visible:ring-1 ra-focus-visible:bg-gray-100",
      )}
    >
      <span className="flex-1 min-w-0 flex justify-between pl-4 py-2 gap-x-2">
        <span
          className={cn(
            "flex-1 truncate",
            handle.type === "session" && "italic",
          )}
          title={text}
        >
          {text}
        </span>
        <span className="flex-none text-gray-500" title={handle.updatedAt}>
          <JournalTimestamp value={handle.updatedAt} />
        </span>
      </span>
      <Button
        className={cn(
          styles["delete-button"],
          "flex w-10 h-10 items-center justify-center text-red-800",
          "outline-none round-focus-ring ra-focus-visible:before:block",
        )}
        onPress={handleDeleteOnClick}
      >
        <span className="codicon codicon-trash" />
      </Button>
    </Item>
  );
};
