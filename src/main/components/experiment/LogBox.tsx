import cn from "clsx";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useStore } from "zustand";
import { LogEntry, LogQueryCursor, LogQueryPage } from "../../../shared/comm";
import { Toolbar, ToolbarItem } from "../Toolbar";
import { useExperimentContext } from "./context";

const logPageLimit = 100;

interface LogBoxProps {
  className?: string;
}

export const LogBox: React.FC<LogBoxProps> = (props) => {
  const { className } = props;
  const intl = useIntl();

  const { session } = useExperimentContext();
  const sessionID = useStore(session.state, (s) => s.id);
  const logCount = useStore(session.state, (s) => s.logCount);

  const [page, setPage] = useState<LogQueryPage>({
    previous: null,
    next: null,
    logs: [],
  });
  const [cursor, setCursor] = useState<LogQueryCursor>({ from: "start" });
  const queryTokenRef = useRef<unknown>({});

  useEffect(() => {
    setPage({
      previous: null,
      next: null,
      logs: [],
    });
    setCursor({ from: "start" });
  }, [sessionID]);

  useEffect(() => {
    const token = {};
    queryTokenRef.current = token;
    session
      .queryLogs({ cursor, limit: logPageLimit, criteria: {} })
      .then((page) => {
        if (queryTokenRef.current !== token) {
          return;
        }
        setPage(page);
      })
      .catch(console.error);
  }, [session, logCount, cursor]);

  const paginationToolbarItems = useMemo<ToolbarItem[]>(
    () => [
      {
        key: "first",
        label: intl.formatMessage({
          id: "views.experiment.logs.pagination.first",
          defaultMessage: "First Page",
        }),
        content: (
          <span className="codicon codicon-chevron-left relative -left-[2px]">
            <span className="codicon codicon-chevron-left absolute left-[4px]" />
          </span>
        ),
        isDisabled: page.previous == null,
        action: () => {
          setCursor({ from: "start" });
        },
      },
      {
        key: "prev",
        label: intl.formatMessage({
          id: "views.experiment.logs.pagination.previous",
          defaultMessage: "Previous Page",
        }),
        content: <span className="codicon codicon-chevron-left" />,
        isDisabled: page.previous == null,
        action: () => {
          if (page.previous != null) {
            setCursor(page.previous);
          }
        },
      },
      {
        key: "next",
        label: intl.formatMessage({
          id: "views.experiment.logs.pagination.next",
          defaultMessage: "Next Page",
        }),
        content: <span className="codicon codicon-chevron-right" />,
        isDisabled: page.next == null,
        action: () => {
          if (page.next != null) {
            setCursor(page.next);
          }
        },
      },
      {
        key: "last",
        label: intl.formatMessage({
          id: "views.experiment.logs.pagination.last",
          defaultMessage: "Last Page",
        }),
        content: (
          <span className="codicon codicon-chevron-right relative -left-[2px]">
            <span className="codicon codicon-chevron-right absolute left-[4px]" />
          </span>
        ),
        isDisabled: page.next == null,
        action: () => {
          setCursor({ from: "end" });
        },
      },
    ],
    [intl, page],
  );

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex-none flex justify-between bg-gray-100">
        <div />
        <Toolbar className="h-10" right={paginationToolbarItems} />
      </div>

      <div tabIndex={0} className="flex-1 overflow-y-auto select-text">
        <LogBoxTable className="w-full min-h-full" logs={page.logs} />
      </div>
    </div>
  );
};

interface LogBoxTableProps {
  className?: string;
  logs: LogEntry[];
}

const LogBoxTable: React.FC<LogBoxTableProps> = (props) => {
  const { className, logs } = props;
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
        {logs.map((log) => (
          <LogRow key={log.sequence} log={log} />
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

export const LogRow: React.FC<LogRowProps> = (props) => {
  const { className, log } = props;

  return (
    <tr
      className={cn(
        "align-baseline",
        log.level === "debug" && "text-gray-500",
        log.level === "warn" && "bg-yellow-50 text-yellow-900",
        log.level === "error" && "bg-red-50 text-red-900",
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
          {{ debug: "DBG", info: "INF", warn: "WRN", error: "ERR" }[log.level]}
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
      </td>
    </tr>
  );
};

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
