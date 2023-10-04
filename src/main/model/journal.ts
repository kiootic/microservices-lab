import { createStore, StoreApi } from "zustand";
import { parse, Parser } from "../utils/parse";
import type { WorkspaceState } from "./workspace";

const maxSessionJournalEntry = 5;

export interface JournalEntryHandle {
  type: "session" | "named";
  id: string;
  updatedAt: string;
}

export interface JournalEntry extends JournalEntryHandle {
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
  delete: (handle: JournalEntryHandle) => void;
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

    const loadJournal = () => {
      const keys = Object.keys(localStorage);
      const sessionJournal: JournalEntryHandle[] = [];
      const namedJournal: JournalEntryHandle[] = [];

      const timestamps = parseTimestamps(localStorage.getItem(keyTimestamps));
      keys.sort((a, b) =>
        (timestamps[a] ?? a).localeCompare(timestamps[b] ?? b),
      );

      for (const key of keys) {
        if (key.startsWith(prefixSession)) {
          sessionJournal.push({
            type: "session",
            id: key.slice(prefixSession.length),
            updatedAt: timestamps[key] ?? new Date().toISOString(),
          });
        } else if (key.startsWith(prefixNamed)) {
          namedJournal.push({
            type: "named",
            id: key.slice(prefixNamed.length),
            updatedAt: timestamps[key] ?? new Date().toISOString(),
          });
        }
      }

      namedJournal.sort((a, b) => a.id.localeCompare(b.id));

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

    const trimJournal = () => {
      const { sessionJournal } = loadJournal();
      if (sessionJournal.length < maxSessionJournalEntry) {
        return;
      }
      const toBeRemoved = sessionJournal.slice(0, -maxSessionJournalEntry);

      const rawTimestamps = localStorage.getItem(keyTimestamps);
      const timestamps =
        rawTimestamps != null ? parseTimestamps(rawTimestamps) : {};
      for (const entry of toBeRemoved) {
        const key = makeStorageKey(entry);
        localStorage.removeItem(key);
        delete timestamps[key];
      }
      localStorage.setItem(keyTimestamps, JSON.stringify(timestamps));
    };

    const saveEntry = (entry: JournalEntry) => {
      const key = makeStorageKey(entry);
      updateTimestamp(key, entry.updatedAt);
      localStorage.setItem(key, JSON.stringify(entry));

      trimJournal();
      const { sessionJournal, namedJournal } = loadJournal();
      set({ sessionJournal, namedJournal });
    };

    const loadEntry = (handle: JournalEntryHandle) => {
      const key = makeStorageKey(handle);
      return parseEntry(localStorage.getItem(key));
    };

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
          type: "named",
          id: name,
          updatedAt: new Date().toISOString(),
          files,
        });
      },
      delete: (handle) => {
        const rawTimestamps = localStorage.getItem(keyTimestamps);
        const timestamps =
          rawTimestamps != null ? parseTimestamps(rawTimestamps) : {};

        const key = makeStorageKey(handle);
        localStorage.removeItem(key);
        delete timestamps[key];

        localStorage.setItem(keyTimestamps, JSON.stringify(timestamps));

        const { sessionJournal, namedJournal } = loadJournal();
        set({ sessionJournal, namedJournal });
      },
    };
  });
}
