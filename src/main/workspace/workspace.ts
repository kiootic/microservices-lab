import ts from "typescript";
import { createLanguageService } from "./host";
import { MemoryVfs } from "./vfs";

export class Workspace {
  private readonly vfs = new MemoryVfs();
  private readonly subscribers = new Set<() => void>();

  readonly lang: ts.LanguageService;

  constructor() {
    this.lang = createLanguageService(this.vfs, {
      target: "ES2020",
      baseUrl: "/",
      moduleResolution: "bundler",
      isolatedModules: true,
      strict: true,
    });

    this.vfs.write("/index.ts", "");
    this.vfs.write("/test.ts", "");
    this.vfs.write("/a/1.ts", "");
    this.vfs.write("/a/2.ts", "");
    this.vfs.write("/b/c/3.ts", "");
    this.vfs.write("/b/d/e/4.ts", "");
    this.vfs.write("/b/5.ts", "");
  }

  getFileVersion(fileName: string): number {
    return this.vfs.getFileVersion(fileName);
  }

  read(fileName: string): string | undefined {
    return this.vfs.read(fileName);
  }

  subscribe(fn: () => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  write(fileName: string, text: string): void {
    this.vfs.write(fileName, text);
    queueMicrotask(() => this.subscribers.forEach((fn) => fn()));
  }

  delete(fileName: string): void {
    this.vfs.delete(fileName);
    queueMicrotask(() => this.subscribers.forEach((fn) => fn()));
  }
}
