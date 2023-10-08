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
for (const [path, content] of Object.entries(rawScenarios)) {
  const [, key, fileName] = /^..\/..\/scenarios\/([^/]+)\/(.+)$/.exec(path)!;

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
