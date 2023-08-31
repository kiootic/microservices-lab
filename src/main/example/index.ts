import { A } from "./a.ts";
import { B } from "./b";

export default async function () {
  console.log(globalThis);
  await Promise.resolve();
  return A + B;
}
