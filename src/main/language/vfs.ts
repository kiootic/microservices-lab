import { minimatch } from "minimatch";

export interface Vfs {
  getFileVersion(fileName: string): number;
  fileNames(): string[];
  content(): ReadonlyMap<string, string>;
  subscribe(callback: () => void): () => void;

  readDir(dir: string): string[];
  glob(patterns: string[]): string[];
  exists(fileName: string): boolean;
  read(fileName: string): string | undefined;
  write(fileName: string, text: string): void;
  delete(fileName: string): void;
}

export interface Store {
  fileNames(): Iterable<string>;
  content(): ReadonlyMap<string, string>;
  subscribe(callback: () => void): () => void;

  has(fileName: string): boolean;
  get(fileName: string): string | undefined;
  set(fileName: string, text: string): void;
  delete(fileName: string): void;
}

export function mapStore(): Store {
  const files = new Map<string, string>();
  const subscribers = new Set<() => void>();

  function notify() {
    queueMicrotask(() => subscribers.forEach((cb) => cb()));
  }

  return {
    fileNames: () => files.keys(),
    content: () => files,
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },

    has: (fileName) => files.has(fileName),
    get: (fileName) => files.get(fileName),
    set: (fileName, text) => {
      files.set(fileName, text);
      notify();
    },
    delete: (fileName) => {
      files.delete(fileName);
      notify();
    },
  };
}

export function storeVfs(store: Store): Vfs {
  let nextVersion = 1;
  const versions = new Map<string, number>();

  return {
    getFileVersion: (fileName) => versions.get(fileName) ?? 0,
    fileNames: () => Array.from(store.fileNames()),
    content: () => store.content(),
    subscribe: (cb) => store.subscribe(cb),

    readDir: (dir) => {
      dir = dir.endsWith("/") ? dir : dir + "/";
      const files = new Set<string>();
      for (const fileName of store.fileNames()) {
        if (!fileName.startsWith(dir)) {
          continue;
        }
        let name = fileName.slice(dir.length);
        const slash = name.indexOf("/");
        if (slash !== -1) {
          name = name.slice(0, slash + 1);
        }
        files.add(name);
      }
      return Array.from(files);
    },
    glob: (patterns) => {
      const pattern =
        patterns.length === 1 ? patterns[0] : `{${patterns.join(",")}}`;
      const matches = minimatch.filter(pattern, {
        dot: true,
        optimizationLevel: 2,
      });
      return Array.from(store.fileNames()).filter((fileName) =>
        matches(fileName)
      );
    },
    exists: (fileName) => store.has(fileName),
    read: (fileName) => store.get(fileName),
    write: (fileName, text) => {
      store.set(fileName, text);
      versions.set(fileName, nextVersion++);
    },
    delete: (fileName) => {
      store.delete(fileName);
      versions.set(fileName, nextVersion++);
    },
  };
}

export function overlayVfs(...layers: Vfs[]): Vfs {
  return {
    getFileVersion: (fileName) => {
      let version = 0;
      for (const layer of layers) {
        version += layer.getFileVersion(fileName);
      }
      return version;
    },
    fileNames: () =>
      Array.from(new Set(layers.map((l) => l.fileNames()).flat())),
    content: () => {
      const content = new Map<string, string>();
      for (const layer of layers) {
        for (const [fileName, text] of layer.content()) {
          content.set(fileName, text);
        }
      }
      return content;
    },
    subscribe: (cb) => {
      const disposers = layers.map((l) => l.subscribe(cb));
      return () => disposers.forEach((fn) => fn());
    },

    readDir: (dir) =>
      Array.from(new Set<string>(layers.map((l) => l.readDir(dir)).flat())),
    glob: (patterns) =>
      Array.from(new Set<string>(layers.map((l) => l.glob(patterns)).flat())),
    exists: (fileName) => layers.some((l) => l.exists(fileName)),
    read: (fileName) => {
      for (const layer of layers) {
        const text = layer.read(fileName);
        if (text != null) {
          return text;
        }
      }
      return undefined;
    },
    write: (fileName, text) => {
      layers[0].write(fileName, text);
    },
    delete: (fileName) => {
      layers[0].delete(fileName);
    },
  };
}
