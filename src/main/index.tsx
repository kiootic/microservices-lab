import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Editor } from "./components/editor/Editor";
import { Workspace } from "./workspace/workspace";

const workspace = new Workspace();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="text-lg">Hello World!</div>
    <Editor workspace={workspace} fileName="/index.ts" />
    <Editor workspace={workspace} fileName="/test.ts" />
  </React.StrictMode>,
);
