import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Sandbox } from "./sandbox";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="text-lg">Hello World!</div>
  </React.StrictMode>,
);

(async () => {
  const sandbox = await Sandbox.create();

  const modules = new Map(
    Object.entries(
      import.meta.glob("./example/**/*.ts", { eager: true, as: "raw" }),
    ).map(([key, value]) => [key.replace("./example/", "/"), value]),
  );
  console.log(await sandbox.run(modules));
})();
