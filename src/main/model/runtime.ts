import RuntimeType from "../../shared/runtime.d.ts?raw";
import VitestExpect from "@vitest/expect/dist/index.d.ts?raw";
import { storeVfs, mapStore } from "../language/vfs";

const RuntimeTypeMarker = "// MARKER: exports";

export const runtimeLibsVfs = storeVfs(mapStore());

runtimeLibsVfs.write(
  "/node_modules/runtime/types.d.ts",
  RuntimeType.slice(0, RuntimeType.indexOf(RuntimeTypeMarker)),
);
runtimeLibsVfs.write("/node_modules/@vitest/expect/index.d.ts", VitestExpect);
