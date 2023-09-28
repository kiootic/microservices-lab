import { createStore, StoreApi } from "zustand";
import { parse, Parser } from "../utils/parse";
import type { WorkspaceState } from "./workspace";

export interface JournalEntryHandle {
  type: "session" | "named";
  id: string;
}

export interface JournalEntry extends JournalEntryHandle {
  updatedAt: string;
  files: Record<string, string>;
}

const prefixSession = "journal$session#";
const prefixNamed = "journal$named#";
const keyTimestamps = "journal$timestamps";

function makeStorageKey(handle: JournalEntryHandle): string {
  switch (handle.type) {
    case "session":
      return prefixSession + handle.id;
    case "named":
      return prefixNamed + handle.id;
  }
}

const parseTimestamps = parse.json(parse.record(parse.string));

const parseEntry: Parser<JournalEntry> = parse.json(
  parse.object({
    type: parse.oneOf("session", "named"),
    id: parse.string,
    updatedAt: parse.string,
    files: parse.record(parse.string),
  }),
);

export interface JournalValue {
  sessionID: string;
  sessionJournal: JournalEntryHandle[];
  namedJournal: JournalEntryHandle[];

  load: (handle: JournalEntryHandle) => WorkspaceState;
  saveSession: (state: WorkspaceState) => void;
  saveNamed: (state: WorkspaceState, name: string) => void;
}
export type Journal = StoreApi<JournalValue>;

export function makeJournal() {
  return createStore<JournalValue>()((set) => {
    const sessionID = crypto.randomUUID();

    const updateTimestamp = (key: string, timestamp: string) => {
      const rawTimestamps = localStorage.getItem(keyTimestamps);
      const timestamps =
        rawTimestamps != null ? parseTimestamps(rawTimestamps) : {};
      timestamps[key] = timestamp;
      localStorage.setItem(keyTimestamps, JSON.stringify(timestamps));
    };

    const saveEntry = (entry: JournalEntry) => {
      const key = makeStorageKey(entry);
      updateTimestamp(key, entry.updatedAt);
      localStorage.setItem(key, JSON.stringify(entry));
    };

    const loadEntry = (handle: JournalEntryHandle) => {
      const key = makeStorageKey(handle);
      return parseEntry(localStorage.getItem(key));
    };

    const loadJournal = () => {
      const keys = Object.keys(localStorage);
      let timestamps: Partial<Record<string, string>> = {};
      const sessionJournal: JournalEntryHandle[] = [];
      const namedJournal: JournalEntryHandle[] = [];

      keys.sort((a, b) =>
        (timestamps[a] ?? a).localeCompare(timestamps[b] ?? b),
      );

      for (const key of keys) {
        if (key === keyTimestamps) {
          timestamps = parseTimestamps(localStorage.getItem(key));
        } else if (key.startsWith(prefixSession)) {
          sessionJournal.push({
            type: "session",
            id: key.slice(prefixSession.length),
          });
        } else if (key.startsWith(prefixNamed)) {
          namedJournal.push({
            type: "named",
            id: key.slice(prefixNamed.length),
          });
        }
      }

      return { sessionJournal, namedJournal };
    };

    let scheduledReload = false;
    window.addEventListener("storage", () => {
      if (scheduledReload) {
        return;
      }

      scheduledReload = true;
      setTimeout(() => {
        scheduledReload = false;
        const { sessionJournal, namedJournal } = loadJournal();
        set({ sessionJournal, namedJournal });
      }, 100);
    });

    const { sessionJournal, namedJournal } = loadJournal();
    return {
      sessionID,
      sessionJournal,
      namedJournal,
      load: (handle) => {
        const entry = loadEntry(handle);
        return {
          sessionID: entry.type === "session" ? entry.id : crypto.randomUUID(),
          files: new Map(Object.entries(entry.files)),
        };
      },
      saveSession: (state) => {
        const files = Object.fromEntries(state.files);
        saveEntry({
          type: "session",
          id: state.sessionID,
          updatedAt: new Date().toISOString(),
          files,
        });
      },
      saveNamed: (state, name) => {
        const files = Object.fromEntries(state.files);
        saveEntry({
          type: "session",
          id: name,
          updatedAt: new Date().toISOString(),
          files,
        });
      },
    };
  });
}
