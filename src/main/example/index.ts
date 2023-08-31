import { A } from "./a.ts";
import { B } from "./b";

async function test(i: number) {
  await Promise.resolve();
  let c = 0;
  for (let j = 0; j < 10; j++) {
    console.log(`> ${c} ${new Date().toISOString()}`);
    await delay(i);
    c += i;
  }
}

export default async function () {
  await Promise.all(new Array(5).fill(0).map((_, i) => test(i + 1)));
  return A + B;
}
