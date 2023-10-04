import cn from "clsx";
import React, { useMemo } from "react";
import { Item, ListBox, Section } from "react-aria-components";
import {
  FormattedDate,
  FormattedRelativeTime,
  FormattedTime,
  useIntl,
} from "react-intl";
import { useStore } from "zustand";
import { useEventCallback } from "../../hooks/event-callback";
import { useTimer } from "../../hooks/timer";
import { useWorkbenchContext } from "../context";

interface JournalViewProps {
  className?: string;
}

export const JournalView: React.FC<JournalViewProps> = (props) => {
  const { className } = props;
  const intl = useIntl();

  const { journal } = useWorkbenchContext();
  const sessionJournal = useStore(journal, (j) => j.sessionJournal);

  const handleOnAction = useEventCallback((key: React.Key) => {
    console.log(key);
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
            .map((handle, i) => {
              const text = intl.formatMessage(
                {
                  id: "views.journal.autosave",
                  defaultMessage: "Autosave {ord}",
                },
                { ord: i + 1 },
              );

              return (
                <Item
                  key={handle.id}
                  id={"session:" + handle.id}
                  textValue={text}
                  className={cn(
                    "flex justify-between px-4 py-2 gap-x-2",
                    "cursor-pointer ra-hover:bg-gray-200",
                    "outline-none ring-inset ra-focus-visible:ring-1 ra-focus-visible:bg-gray-100",
                  )}
                >
                  <span className="flex-1 truncate">{text}</span>
                  <span
                    className="flex-none text-gray-500"
                    title={handle.updatedAt}
                  >
                    <TimestampDisplay value={handle.updatedAt} />
                  </span>
                </Item>
              );
            })}
        </Section>
      </ListBox>
    </div>
  );
};

const relativeThreshold = 1000 * 60 * 60 * 24;

const TimestampDisplay: React.FC<{ value: string }> = (props) => {
  const timestamp = useMemo(() => new Date(props.value), [props.value]);
  const now = useTimer("minute");

  const timeDiff = timestamp.getTime() - now.getTime();
  if (timeDiff > -relativeThreshold) {
    const value = Math.min(-1, Math.round(timeDiff / 1000));
    return (
      <FormattedRelativeTime
        key={props.value}
        value={value}
        style="narrow"
        updateIntervalInSeconds={1}
      />
    );
  } else if (
    timestamp.getDate() === now.getDate() &&
    timestamp.getMonth() === now.getMonth() &&
    timestamp.getFullYear() === now.getFullYear()
  ) {
    return <FormattedTime value={timestamp} />;
  } else {
    return (
      <FormattedDate
        value={timestamp}
        year="numeric"
        month="short"
        day="numeric"
      />
    );
  }
};
