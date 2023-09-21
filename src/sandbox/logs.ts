import {
  LogEntry,
  LogQuery,
  LogQueryCriteria,
  LogQueryPage,
} from "../shared/comm";

export class LogStore {
  private sequence = 0;
  private readonly logs: LogEntry[] = [];

  get count() {
    return this.logs.length;
  }

  add(log: Omit<LogEntry, "sequence">) {
    this.logs.push({ ...log, sequence: this.sequence++ });
  }

  addBatch(logs: Omit<LogEntry, "sequence">[]) {
    for (const log of logs) {
      this.logs.push({ ...log, sequence: this.sequence++ });
    }
  }

  query(query: LogQuery) {
    const { cursor, limit, criteria } = query;
    const criteriaFn = checkLog.bind(undefined, criteria);
    switch (cursor.from) {
      case "after":
        return queryAfter(this.logs, cursor.after, limit, criteriaFn);
      case "before":
        return queryBefore(this.logs, cursor.before, limit, criteriaFn);
    }
  }
}

function checkLog(criteria: LogQueryCriteria, log: LogEntry): boolean {
  const { showDebugLogs = false, search } = criteria;
  if (!showDebugLogs && log.level === "debug") {
    return false;
  }

  if (search != null) {
    const contents = [log.name, ": ", log.message];
    for (const [key, value] of Object.entries(log.context ?? {})) {
      contents.push(" ", key, ": ", value);
    }
    if (!contents.join("").toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
  }
  return true;
}

function queryAfter(
  logs: LogEntry[],
  after: number,
  limit: number,
  criteriaFn: (log: LogEntry) => boolean,
): LogQueryPage {
  const result: LogEntry[] = [];

  let i = after;
  for (; i < logs.length; i++) {
    if (criteriaFn(logs[i])) {
      if (result.length >= limit) {
        break;
      }
      result.push(logs[i]);
    }
  }

  return {
    previous: { from: "before", before: after - 1 },
    next: { from: "after", after: i },
    logs: result,
  };
}

function queryBefore(
  logs: LogEntry[],
  before: number,
  limit: number,
  criteriaFn: (log: LogEntry) => boolean,
): LogQueryPage {
  const result: LogEntry[] = [];

  let i = before;
  for (; i >= 0; i--) {
    if (criteriaFn(logs[i])) {
      if (result.length >= limit) {
        break;
      }
      result.push(logs[i]);
    }
  }

  return {
    previous: { from: "before", before: i },
    next: { from: "after", after: before + 1 },
    logs: result.reverse(),
  };
}
