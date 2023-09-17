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

  add(logs: LogEntry[]) {
    for (const log of logs) {
      this.logs.push({ ...log, sequence: this.sequence++ });
    }
  }

  query(query: LogQuery) {
    const { cursor, limit, criteria } = query;
    const criteriaFn = checkLog.bind(undefined, criteria);
    switch (cursor.from) {
      case "start":
        return queryAfter(this.logs, 0, limit, criteriaFn);
      case "after":
        return queryAfter(this.logs, cursor.after, limit, criteriaFn);
      case "end":
        return queryBefore(this.logs, null, limit, criteriaFn);
      case "before":
        return queryBefore(this.logs, cursor.before, limit, criteriaFn);
    }
  }
}

function checkLog(criteria: LogQueryCriteria, log: LogEntry): boolean {
  if (criteria.name != null && !log.name.includes(criteria.name)) {
    return false;
  }
  return true;
}

function queryAfter(
  logs: LogEntry[],
  after: number | null,
  limit: number,
  criteriaFn: (log: LogEntry) => boolean,
): LogQueryPage {
  const result: LogEntry[] = [];

  const start = after ?? 0;
  let i = start;
  for (; i < logs.length; i++) {
    if (criteriaFn(logs[i])) {
      if (result.length >= limit) {
        break;
      }
      result.push(logs[i]);
    }
  }
  const hasNext = i < logs.length;

  return {
    previous: start === 0 ? null : { from: "before", before: start - 1 },
    next: hasNext ? { from: "after", after: i } : null,
    logs: result,
  };
}

function queryBefore(
  logs: LogEntry[],
  before: number | null,
  limit: number,
  criteriaFn: (log: LogEntry) => boolean,
): LogQueryPage {
  const result: LogEntry[] = [];

  const start = before ?? logs.length - 1;
  let i = start;
  for (; i >= 0; i--) {
    if (criteriaFn(logs[i])) {
      if (result.length >= limit) {
        break;
      }
      result.push(logs[i]);
    }
  }
  const hasPrevious = i >= 0;

  return {
    previous: hasPrevious ? { from: "before", before: i } : null,
    next:
      start === logs.length - 1 ? null : { from: "after", after: start + 1 },
    logs: result.reverse(),
  };
}
