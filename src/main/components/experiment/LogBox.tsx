import cn from "clsx";
import React, { useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { LogEntry } from "../../../shared/comm";

interface LogBoxProps {
  className?: string;
}

export const LogBox: React.FC<LogBoxProps> = (props) => {
  const { className } = props;

  const logs = useMemo(
    () =>
      new Array(30).fill(0).map(
        (_, i): LogEntry => ({
          sequence: i,
          timestamp: Math.random() * 1000,
          level: (["debug", "warn", "error", "info"] as const)[
            Math.floor(Math.random() * 4)
          ],
          message: "Labore ullamco incididunt excepteur ex enim id nisi.",
          name: "name",
        }),
      ),
    [],
  );

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex-none  bg-gray-100">
        <div className="h-8" />
      </div>

      <div tabIndex={0} className="flex-1 overflow-y-auto select-text">
        <LogBoxTable className="w-full min-h-full" logs={logs} />
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
    <table className={cn("text-xs font-mono", className)}>
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
          <td className="border-r-2"></td>
          <td></td>
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
      <td className="p-0 min-w-[2rem] text-center align-top">
        <span className="inline-block pt-px">
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
        className="p-0 py-0.5 pr-1 text-right border-r-2"
        data-timestamp={log.timestamp}
      >
        <span>{formatTimestamp(log.timestamp)}</span>
      </td>
      <td className="p-0 py-0.5 w-full -indent-2 pl-4 break-all">
        <span className="font-semibold">{log.name} </span>
        <span>{log.message}</span>
      </td>
    </tr>
  );
};

function formatTimestamp(timestamp: number) {
  const seconds = timestamp % 60;
  const minutes = Math.floor(timestamp / 60) % 60;
  const hours = Math.floor(timestamp / (60 * 60)) % 24;
  const days = Math.floor(timestamp / (60 * 60 * 24));

  const result = [
    seconds.toFixed(3).padStart(6, "0"),
    minutes.toString().padStart(2, "0"),
  ];

  if (hours !== 0 || days !== 0) {
    result.push(
      days === 0 ? hours.toString() : hours.toString().padStart(2, "0"),
    );
  }
  if (days !== 0) {
    result.push(days.toString());
  }

  return result.reverse().join(":");
}
