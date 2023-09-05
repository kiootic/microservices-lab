export interface Vfs {
  getFileVersion(fileName: string): number;
  fileNames(): string[];
  content(): Map<string, string>;

  exists(fileName: string): boolean;
  read(fileName: string): string | undefined;
  write(fileName: string, text: string): void;
  delete(fileName: string): void;
}

export function memoryVfs(): Vfs {
  let nextVersion = 1;
  const files = new Map<string, string>();
  const versions = new Map<string, number>();
  return {
    getFileVersion: (fileName) => versions.get(fileName) ?? 0,
    fileNames: () => Array.from(files.keys()),
    content: () => new Map(files),
    exists: (fileName) => files.has(fileName),
    read: (fileName) => files.get(fileName),
    write: (fileName, text) => {
      files.set(fileName, text);
      versions.set(fileName, nextVersion++);
    },
    delete: (fileName) => {
      files.delete(fileName);
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
