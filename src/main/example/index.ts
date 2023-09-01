const services = defineServices({
  db: import("./db"),
  counter: import("./counter"),
});

declare global {
  interface SystemServices extends ServicesType<typeof services> {}
}

import "./test";

export default async function main() {
  await setupSystem();
  return await runTests();
}
