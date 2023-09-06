import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Editor } from "./components/editor/Editor";
import { makeWorkspace } from "./model/workspace";
import { useStore } from "zustand";

const workspace = makeWorkspace();

const FileEditor: React.FC<{ fileName: string }> = ({ fileName }) => {
  const getFile = useStore(workspace, (w) => w.getFile);
  const file = useMemo(() => getFile(fileName), [getFile, fileName]);
  return <Editor file={file} />;
};

const Test: React.FC = () => {
  const fileNames = useStore(workspace, (w) => w.fileNames);
  return fileNames.map((fileName) => (
    <FileEditor key={fileName} fileName={fileName} />
  ));
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="text-lg">Hello World!</div>
    <Test />
  </React.StrictMode>
);

setTimeout(
  () => workspace.getState().vfs.write("/index.ts", "import {X} from 'test';"),
  1000
);
setTimeout(
  () => workspace.getState().vfs.write("/test.ts", "export class X{}"),
  2000
);
