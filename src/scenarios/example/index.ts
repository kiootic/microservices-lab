import "./services/counter";
import "./services/db";
import "./tests/basic";

export default async function main() {
  Runtime.setupSystem();
  return await Runtime.runTests();
}
