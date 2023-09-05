import ts from "typescript";
import { createLanguageService } from "./host";
import { memoryVfs } from "./vfs";

export class Workspace {
  private readonly vfs = memoryVfs();
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
