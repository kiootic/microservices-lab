import cn from "clsx";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, ButtonProps } from "react-aria-components";
import ReactDOM from "react-dom";
import { FormattedMessage } from "react-intl";
import { useStore } from "zustand";
import { LogEntry, LogQueryCursor, LogQueryPage } from "../../../shared/comm";
import { useEventCallback } from "../../hooks/event-callback";
import { Toolbar } from "../Toolbar";
import { useExperimentContext } from "./context";
import { withScrollAnchor } from "../../utils/scroll-anchor";

const logPageLimit = 100;

interface LogBoxProps {
  className?: string;
}

export const LogBox: React.FC<LogBoxProps> = (props) => {
  const { className } = props;

  const { session } = useExperimentContext();
  const sessionID = useStore(session.state, (s) => s.id);
  const logCount = useStore(session.state, (s) => s.logCount);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const firstRowRef = useRef<HTMLTableRowElement>(null);
  const lastRowRef = useRef<HTMLTableRowElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  interface LogState {
    isTailing: boolean;
    pages: LogQueryPage[];
  }
  const [state, setState] = useState<LogState>({ isTailing: true, pages: [] });

  const loadTokenRef = useRef<unknown>({});
  const loadPage = useEventCallback(
    async (cursor: LogQueryCursor | null, isReload: boolean) => {
      const token = {};
      loadTokenRef.current = token;

      const queryCursor = cursor ?? { from: "before", before: logCount - 1 };
      const page = await session.queryLogs({
        cursor: queryCursor,
        limit: logPageLimit,
        criteria: {},
      });

      if (loadTokenRef.current !== token) {
        return;
      }
      loadTokenRef.current = null;

      let anchorElement: HTMLElement | null = null;
      if (cursor == null) {
        anchorElement = bottomAnchorRef.current;
      } else if (cursor.from === "before") {
        anchorElement = firstRowRef.current;
      } else if (cursor.from === "after") {
        anchorElement = lastRowRef.current;
      }

      withScrollAnchor(scrollContainerRef.current, anchorElement, () => {
        ReactDOM.flushSync(() => {
          const isTailing = cursor == null;
          if (isReload) {
            setState({ isTailing, pages: [page] });
          } else if (queryCursor.from === "before") {
            setState((s) => ({
              isTailing,
              pages: [page, ...s.pages].slice(0, 2),
            }));
          } else if (queryCursor.from === "after") {
            setState((s) => ({
              isTailing,
              pages: [...s.pages, page].slice(-2),
            }));
          }
        });
      });
    },
  );

  useEffect(() => {
    loadTokenRef.current = null;
    setState({ isTailing: true, pages: [] });
  }, [sessionID]);

  useEffect(() => {
    if (state.isTailing) {
      loadPage(null, true).catch(console.error);
    }
  }, [loadPage, state.isTailing, logCount]);

  const handleFirstPageOnPress = useEventCallback(() => {
    if (loadTokenRef.current == null) {
      loadPage({ from: "after", after: 0 }, true).catch(console.error);
    }
  });

  const handlePreviousPageOnPress = useEventCallback(() => {
    const cursor = state.pages.at(0)?.previous;
    if (cursor != null && loadTokenRef.current == null) {
      loadPage(cursor, false).catch(console.error);
    }
  });

  const handleLastPageOnPress = useEventCallback(() => {
    if (loadTokenRef.current == null) {
      loadPage(null, true).catch(console.error);
    }
  });

  const handleNextPageOnPress = useEventCallback(() => {
    const cursor = state.pages.at(-1)?.next;
    if (cursor != null && loadTokenRef.current == null) {
      loadPage(cursor, false).catch(console.error);
    }
  });

  const logs = useMemo(() => state.pages.flatMap((p) => p.logs), [state]);

  const isCursorValid = (cursor: LogQueryCursor | null | undefined) => {
    switch (cursor?.from) {
      case "before":
        return cursor.before >= 0;
      case "after":
        return cursor.after < logCount;
    }
    return false;
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex-none flex justify-between bg-gray-100">
        <Toolbar className="h-10" />
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto select-text"
      >
        <div className="flex">
          {isCursorValid(state.pages.at(0)?.previous) ? (
            <>
              <LogBoxButton
                className="flex-none w-12 relative"
                onPress={handleFirstPageOnPress}
              >
                <span className="codicon codicon-chevron-up -translate-y-0.5" />
                <span className="codicon codicon-chevron-up absolute translate-y-0.5" />
              </LogBoxButton>
              <LogBoxButton
                className="flex-1"
                onPress={handlePreviousPageOnPress}
              >
                <span className="codicon codicon-chevron-up" />
              </LogBoxButton>
            </>
          ) : null}
        </div>

        <LogBoxTable
          className="w-full min-h-full"
          logs={logs}
          firstRowRef={firstRowRef}
          lastRowRef={lastRowRef}
        />

        <div ref={bottomAnchorRef} className="flex">
          {!state.isTailing && isCursorValid(state.pages.at(-1)?.next) ? (
            <>
              <LogBoxButton
                className="flex-none w-12 relative"
                onPress={handleLastPageOnPress}
              >
                <span className="codicon codicon-chevron-down -translate-y-0.5" />
                <span className="codicon codicon-chevron-down absolute translate-y-0.5" />
              </LogBoxButton>
              <LogBoxButton className="flex-1" onPress={handleNextPageOnPress}>
                <span className="codicon codicon-chevron-down" />
              </LogBoxButton>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const LogBoxButton: React.FC<ButtonProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Button
      className={cn(
        "flex justify-center py-1 text-gray-500",
        "ra-hover:bg-gray-200 ra-pressed:bg-gray-300",
        "outline-none ring-inset ra-focus-visible:ring-1 ra-focus-visible:bg-gray-100",
        className,
      )}
      {...rest}
    />
  );
};

interface LogBoxTableProps {
  className?: string;
  logs: LogEntry[];
  firstRowRef?: React.RefObject<HTMLTableRowElement>;
  lastRowRef?: React.RefObject<HTMLTableRowElement>;
}

const LogBoxTable: React.FC<LogBoxTableProps> = (props) => {
  const { className, logs, firstRowRef, lastRowRef } = props;
  return (
    <table className={cn("text-xs font-mono relative", className)}>
      <thead className="sr-only">
        <tr>
          <th>
            <FormattedMessage
              id="views.experiment.logs.columns.level"
              defaultMessage="Level"
            />
          </th>
          <th>
            <FormattedMessage
              id="views.experiment.logs.columns.timestamp"
              defaultMessage="Timestamp"
            />
          </th>
          <th className="w-full">
            <FormattedMessage
              id="views.experiment.logs.columns.entry"
              defaultMessage="Entry"
            />
          </th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log, i) => (
          <LogRow
            ref={
              i === 0
                ? firstRowRef
                : i === logs.length - 1
                ? lastRowRef
                : undefined
            }
            key={log.sequence}
            log={log}
          />
        ))}
      </tbody>
      <tfoot className="h-full">
        <tr>
          <td></td>
          <td className={logs.length > 0 ? "border-r-2" : ""}></td>
          <td>
            {logs.length === 0 ? (
              <span className="absolute inset-0 flex items-center justify-center select-none">
                <FormattedMessage
                  id="views.experiment.logs.empty"
                  defaultMessage="No logs found"
                />
              </span>
            ) : null}
          </td>
        </tr>
      </tfoot>
    </table>
  );
};

interface LogRowProps {
  className?: string;
  log: LogEntry;
}

const LogRow = React.forwardRef<HTMLTableRowElement, LogRowProps>(
  (props, ref) => {
    const { className, log } = props;

    return (
      <tr
        ref={ref}
        className={cn(
          "align-baseline",
          log.level === "debug" && "text-gray-500",
          log.level === "warn" && "bg-yellow-50 text-yellow-900",
          log.level === "error" && "bg-red-50 text-red-900",
          "hover:bg-primary-50",
          className,
        )}
      >
        <td className="p-0 text-right align-top">
          <span className="inline-block w-6 pt-px">
            {log.level === "warn" ? (
              <span className="align-middle codicon codicon-warning"></span>
            ) : null}
            {log.level === "error" ? (
              <span className="align-middle codicon codicon-error"></span>
            ) : null}
          </span>
          <span className="sr-only">
            {
              { debug: "DBG", info: "INF", warn: "WRN", error: "ERR" }[
                log.level
              ]
            }
          </span>
        </td>
        <td
          className="px-1 py-0.5 text-right border-r-2"
          data-timestamp={log.timestamp}
        >
          <span className="min-w-min w-10 inline-block">
            {formatTimestamp(log.timestamp)}
          </span>
        </td>
        <td className="p-0 py-0.5 w-full -indent-2 pl-4 break-all">
          <span className="font-semibold">{log.name}&nbsp;&nbsp;</span>
          <span>{log.message}</span>
          {Object.entries(log.context ?? {}).map(([key, value], i) => (
            <React.Fragment key={key}>
              {i === 0 ? <br /> : <span className="ml-4">&nbsp;</span>}
              <span className="inline-block indent-0 pt-1">
                <span className="font-semibold">{key}: </span>
                <span className="text-primary-600">{value}</span>
              </span>
            </React.Fragment>
          ))}
        </td>
      </tr>
    );
  },
);

function formatTimestamp(timestamp: number) {
  timestamp /= 1000;
  const seconds = timestamp % 60;
  const minutes = Math.floor(timestamp / 60) % 60;
  const hours = Math.floor(timestamp / (60 * 60)) % 24;

  const result = [
    seconds.toFixed(3).padStart(6, "0"),
    minutes.toString().padStart(2, "0"),
  ];

  if (hours !== 0) {
    result.push(hours.toString());
  }

  return result.reverse().join(":");
}
