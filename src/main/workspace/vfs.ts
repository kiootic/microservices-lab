import { minimatch } from "minimatch";

export interface Vfs {
  getFileVersion(fileName: string): number;
  fileNames(): string[];
  content(): ReadonlyMap<string, string>;

  readDir(dir: string): string[];
  glob(patterns: string[]): string[];
  exists(fileName: string): boolean;
  read(fileName: string): string | undefined;
  write(fileName: string, text: string): void;
  delete(fileName: string): void;
}

export class MemoryVfs implements Vfs {
  private readonly files = new Map<string, string>();

  private nextVersion = 1;
  private readonly versions = new Map<string, number>();

  getFileVersion(fileName: string) {
    return this.versions.get(fileName) ?? 0;
  }

  fileNames() {
    return Array.from(this.files.keys());
  }

  content(): ReadonlyMap<string, string> {
    return this.files;
  }

  readDir(dir: string): string[] {
    dir = dir.endsWith("/") ? dir : dir + "/";
    const files = new Set<string>();
    for (const fileName of this.files.keys()) {
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
  }

  glob(patterns: string[]): string[] {
    const pattern =
      patterns.length === 1 ? patterns[0] : `{${patterns.join(",")}}`;
    const matches = minimatch.filter(pattern, {
      dot: true,
      optimizationLevel: 2,
    });
    return Array.from(this.files.keys()).filter((fileName) =>
      matches(fileName),
    );
  }

  exists(fileName: string) {
    return this.files.has(fileName);
  }

  read(fileName: string) {
    return this.files.get(fileName);
  }

  write(fileName: string, text: string) {
    this.files.set(fileName, text);
    this.versions.set(fileName, this.nextVersion++);
  }

  delete(fileName: string) {
    this.files.delete(fileName);
    this.versions.set(fileName, this.nextVersion++);
  }
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
