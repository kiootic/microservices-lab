import cn from "clsx";
import React from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import { useStore } from "zustand";
import { useEventCallback } from "../hooks/event-callback";
import { useWorkbenchContext } from "./context";
import {
  WorkbenchPane,
  WorkbenchView,
  allWorkbenchViews,
} from "./useWorkbench";
import { ExperimentView } from "./views/ExperimentView";
import { JournalView } from "./views/JournalView";
import { NotebookView } from "./views/NotebookView";

interface PaneProps {
  className?: string;
  pane: WorkbenchPane;
}

export const Pane: React.FC<PaneProps> = (props) => {
  const { className, pane } = props;

  const { state, switchView } = useWorkbenchContext();
  const views = viewDescriptors;
  const currentView = useStore(state, (s) => s.paneView[pane]);

  const handleOnSelectionChange = useEventCallback((key: React.Key) => {
    const view = key as WorkbenchView;
    switchView(pane, view);
  });

  return (
    <Tabs
      className={cn("flex flex-col border", className)}
      keyboardActivation="manual"
      selectedKey={currentView}
      onSelectionChange={handleOnSelectionChange}
    >
      <TabList
        className={cn(
          "flex-none h-10 flex after:flex-grow after:w-4 after:bg-gray-100 after:border-t after:border-b-2",
        )}
        aria-label={paneName(pane)}
      >
        {views.map((view) => (
          <Tab
            className={cn(
              "w-28 flex items-center justify-center",
              "border-b-2 border-t border-r-2 bg-gray-100",
              "cursor-pointer",
              "outline-none underline-offset-8 decoration-2 ra-focus-visible:underline ra-focus-visible:decoration-primary-400",
              "ra-hover:bg-gray-50",
              "ra-selected:border-y-transparent ra-selected:bg-transparent",
              "relative before:absolute before:inset-x-0 before:top-0 before:-mx-px before:-my-px",
              "before:border-t-2 before:border-t-primary-500",
              "before:hidden ra-selected:before:block",
            )}
            key={view.id}
            id={view.id}
          >
            {view.name}
          </Tab>
        ))}
      </TabList>

      {views.map((view) => (
        <TabPanel className="flex-1 min-h-0" key={view.id} id={view.id}>
          <view.Component className="w-full h-full" />
        </TabPanel>
      ))}
    </Tabs>
  );
};

function paneName(pane: WorkbenchPane) {
  switch (pane) {
    case "primary":
      return "Primary pane";
    case "secondary":
      return "Secondary pane";
  }
}

interface ViewDescriptor {
  id: WorkbenchView;
  name: string;
  Component: React.ComponentType<{ className?: string }>;
}

function viewDescriptor(view: WorkbenchView): ViewDescriptor {
  switch (view) {
    case "notebook":
      return { id: view, name: "Notebook", Component: NotebookView };
    case "experiment":
      return { id: view, name: "Experiment", Component: ExperimentView };
    case "journal":
      return { id: view, name: "Journal", Component: JournalView };
  }
}

const viewDescriptors = allWorkbenchViews.map(viewDescriptor);