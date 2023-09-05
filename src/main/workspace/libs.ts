import { MemoryVfs } from "./vfs";

const libs = import.meta.glob("/node_modules/typescript/lib/lib.es*.d.ts", {
  eager: true,
  as: "raw",
});

export const libsVfs = new MemoryVfs();
for (const [path, code] of Object.entries(libs)) {
  libsVfs.write(path.replace("/node_modules/typescript/lib", "/types"), code);
}
