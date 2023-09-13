import React from "react";
import ReactDOM from "react-dom/client";
import x from "react/package.json?raw";
import { makeWorkspace } from "./model/workspace";
import { Workbench } from "./workbench/Workbench";
import { useWorkbench } from "./workbench/useWorkbench";

import "./index.css";

const workspace = makeWorkspace();
workspace.getState().vfs.write("/index.ts", "import {X} from 'test';");
workspace.getState().vfs.write("/test.ts", "export class X {}");
workspace.getState().vfs.write("/test/react.json", x);

const Test: React.FC = () => {
  const controller = useWorkbench(workspace);
  return <Workbench className="w-screen h-screen" controller={controller} />;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Test />
  </React.StrictMode>,
);
