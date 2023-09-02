import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Editor } from "./components/editor/Editor";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="text-lg">Hello World!</div>
    <Editor />
  </React.StrictMode>,
);
