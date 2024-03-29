import React, { useLayoutEffect, useRef } from "react";
import cn from "clsx";
import { useNotebookContext } from "./context";
import { useStore } from "zustand";
import { FileView } from "./FileView";
import { useEventCallback } from "../../hooks/event-callback";
import { useNavContext } from "../nav/context";
import { EmptyView } from "./EmptyView";

interface ContentProps {
  className?: string;
}

export const Content: React.FC<ContentProps> = (props) => {
  const { className } = props;
  const { workspace, state } = useNotebookContext();
  const fileNames = useStore(workspace, (w) => w.fileNames);

  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current == null) {
      return;
    }
    const elem = ref.current;
    elem.scrollTop = state.getState().scrollY;
  }, [state]);

  const handleOnScroll = useEventCallback((e: React.UIEvent<HTMLElement>) => {
    state.setState({ scrollY: e.currentTarget.scrollTop });
  });

  const { useCompactLayout } = useNavContext();

  return (
    <div
      ref={ref}
      className={cn(
        className,
        "overflow-auto",
        fileNames.length > 0 && "after:block after:h-[calc(100%-4rem)]",
        useCompactLayout && "pt-10",
      )}
      onScroll={handleOnScroll}
    >
      {fileNames.length === 0 ? (
        <EmptyView className="w-full h-full" />
      ) : (
        <>
          {fileNames.map((fileName) => (
            <FileView key={fileName} fileName={fileName} />
          ))}
          <hr className="ml-12 flex-1 border-t-2 mt-5" />
        </>
      )}
    </div>
  );
};
