import { mapStore, storeVfs } from "./vfs";

const libs = import.meta.glob("/node_modules/typescript/lib/lib.es*.d.ts", {
  eager: true,
  as: "raw",
});

export const libsVfs = storeVfs(mapStore());
for (const [path, code] of Object.entries(libs)) {
  libsVfs.write(path.replace("/node_modules/typescript/lib", "/types"), code);
}
