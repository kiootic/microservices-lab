import React from "react";
import ReactDOM from "react-dom/client";
import { Notebook } from "./components/notebook/Notebook";
import "./index.css";
import { makeWorkspace } from "./model/workspace";
import { useNotebook } from "./components/notebook/useNotebook";
import x from "react/package.json?raw";

const workspace = makeWorkspace();
workspace.getState().vfs.write("/index.ts", "import {X} from 'test';");
workspace.getState().vfs.write("/test.ts", "export class X {}");
workspace.getState().vfs.write("/react.json", x);
workspace.getState().vfs.write("/test.ts", "export class X {}");

const Test: React.FC = () => {
  const controller = useNotebook(workspace);
  return <Notebook className="w-screen h-screen" controller={controller} />;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Test />
  </React.StrictMode>,
);
