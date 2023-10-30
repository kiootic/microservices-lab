import "./services/api";
import "./services/db";
import "./tests/basic";

export default async function main() {
  return await Runtime.runTests();
}
