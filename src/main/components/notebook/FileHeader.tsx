import cn from "clsx";
import React from "react";
import { useStore } from "zustand";
import { useNotebookContext } from "./context";
import { mergeProps, useHover, usePress } from "react-aria";
import { useEventCallback } from "../../hooks/event-callback";

interface FileHeaderProps {
  className?: string;
  fileName: string;
}

export const FileHeader: React.FC<FileHeaderProps> = (props) => {
  const { className, fileName } = props;

  const { state, toggleOpen } = useNotebookContext();
  const isOpened = useStore(state, (s) => !s.isCollapsed[fileName]);

  const handleOnPress = useEventCallback(() => {
    toggleOpen(fileName);
  });
  const { pressProps, isPressed } = usePress({
    preventFocusOnPress: true,
    onPress: handleOnPress,
  });
  const { hoverProps, isHovered } = useHover({});

  return (
    <div
      {...mergeProps(pressProps, hoverProps)}
      className={cn(
        "flex h-10 items-center text-sm",
        isHovered && "font-bold",
        isPressed && "text-gray-600",
        className,
      )}
    >
      <span
        className={cn(
          "flex-none w-12 h-full flex items-center justify-center",
          !isHovered || isPressed ? "text-gray-400" : "",
        )}
      >
        <span
          className={cn(
            "codicon",
            isOpened ? "codicon-chevron-down" : "codicon-chevron-right",
          )}
        />
      </span>
      <div className="truncate pl-2 pr-4">
        <span className="font-mono">{fileName}</span>
      </div>
      <hr className="w-8 flex-shrink-0 flex-grow border-t-2" />
    </div>
  );
};
