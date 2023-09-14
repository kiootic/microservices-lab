import { useActionGroup, useActionGroupItem } from "@react-aria/actiongroup";
import cn from "clsx";
import React, { useMemo, useRef } from "react";
import { ButtonProps } from "react-aria-components";
import { Item, ListState, Node, useListState } from "react-stately";
import { useEventCallback } from "../hooks/event-callback";
import { IconButton } from "./IconButton";
import styles from "./Toolbar.module.css";

export interface ToolbarItem {
  key: string;
  label: string;
  content: React.ReactNode;
  action: () => void;
  isDisabled?: boolean;
}

interface ToolbarItemInternal extends ToolbarItem {
  position: "left" | "right";
}

interface ToolbarProps {
  className?: string;
  left?: ToolbarItem[];
  right?: ToolbarItem[];
}

export const Toolbar: React.FC<ToolbarProps> = (props) => {
  const { className, left, right } = props;

  const ref = useRef<HTMLDivElement>(null);

  const items = useMemo<ToolbarItemInternal[]>(
    () => [
      ...(left ?? []).map((x) => ({ ...x, position: "left" as const })),
      ...(right ?? []).map((x) => ({ ...x, position: "right" as const })),
    ],
    [left, right],
  );
  const disabledKeys = useMemo(
    () => items.filter((x) => x.isDisabled).map((x) => x.key),
    [items],
  );

  const renderItem = useEventCallback((item: ToolbarItem) => {
    return <Item textValue={item.label}>{item.content}</Item>;
  });

  const listProps = { items, disabledKeys, children: renderItem };

  const state = useListState(listProps);
  const { actionGroupProps } = useActionGroup(listProps, state, ref);

  return (
    <div
      ref={ref}
      className={cn("flex items-center p-1 gap-x-1", className)}
      {...actionGroupProps}
    >
      {[...state.collection].map((node) => (
        <ToolBarButton key={node.key} node={node} state={state} />
      ))}
    </div>
  );
};

interface ToolBarButtonProps {
  node: Node<ToolbarItemInternal>;
  state: ListState<ToolbarItemInternal>;
}

const ToolBarButton: React.FC<ToolBarButtonProps> = (props) => {
  const { node, state } = props;
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useActionGroupItem({ key: node.key }, state, ref);

  const buttonPositionClass =
    node.value == null
      ? ""
      : {
          left: styles["button--left"],
          right: styles["button--right"],
        }[node.value.position];

  const handleOnPress = useEventCallback(() => node.value?.action());

  return (
    <IconButton
      ref={ref}
      {...(buttonProps as ButtonProps)}
      className={cn(buttonPositionClass, "flex-none aspect-square")}
      isDisabled={node.value?.isDisabled}
      onPress={handleOnPress}
    >
      {node.rendered}
    </IconButton>
  );
};
