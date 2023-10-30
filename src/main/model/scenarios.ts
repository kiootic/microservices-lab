import { Parser, parse } from "../utils/parse";

const rawScenarios = import.meta.glob("../../scenarios/*/**", {
  eager: true,
  as: "raw",
});

export interface Scenario {
  readonly key: string;
  readonly name: string;
  readonly files: ReadonlyMap<string, string>;
}

interface ScenarioDraft {
  key: string;
  name: string;
  files: Map<string, string>;
}

interface ScenarioMeta {
  name: string;
}

const parseScenarioMeta: Parser<ScenarioMeta> = parse.json(
  parse.object({
    name: parse.string,
  }),
);

const scenarioMap = new Map<string, ScenarioDraft>();

const metaJSON = "_meta.json";

const scenarioFiles = Object.fromEntries(
  Object.entries(rawScenarios).map(([path, content]) => [
    path.slice("../../scenarios/".length),
    content,
  ]),
);
const scenarioKeys = Object.keys(scenarioFiles).flatMap((path) => {
  const match = /^(.+)\/_meta\.json$/.exec(path);
  if (match == null) {
    return [];
  }

  return match[1];
});

for (const [path, content] of Object.entries(scenarioFiles)) {
  const key = scenarioKeys.find((key) => path.startsWith(key));
  if (key == null) {
    continue;
  }
  const fileName = path.slice(key.length + 1);

  let scenario = scenarioMap.get(key);
  if (scenario == null) {
    scenario = { key, name: key, files: new Map() };
    scenarioMap.set(key, scenario);
  }

  if (fileName === metaJSON) {
    const meta = parseScenarioMeta(content);
    scenario.name = meta.name;
  } else {
    scenario.files.set("/" + fileName, content);
  }
}

export const scenarios: Scenario[] = Array.from(scenarioMap.values());
scenarios.sort((a, b) => a.name.localeCompare(b.name));
