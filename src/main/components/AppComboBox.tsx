import React, { useMemo, useState } from "react";
import cn from "clsx";
import {
  Button,
  Input,
  Item,
  ListBox,
  Popover,
  ComboBox,
  ComboBoxProps,
} from "react-aria-components";
import styles from "./AppComboxBox.module.css";
import { useEventCallback } from "../hooks/event-callback";

export interface ComboBoxItem {
  key: string;
  value?: string;
}

interface AppComboBoxProps
  extends Omit<ComboBoxProps<object>, "items" | "defaultItems" | "children"> {
  className?: string;
  popoverClassName?: string;
  items: ComboBoxItem[];
}

export function AppComboBox(props: AppComboBoxProps) {
  const { className, popoverClassName, items, ...rest } = props;

  return (
    <ComboBox
      className={cn(
        styles["root"],
        "flex border-b-2 ra-focus:border-primary-400",
        className,
      )}
      {...rest}
    >
      <Input
        className={cn("flex-1 bg-transparent pl-2 py-1", "outline-none")}
      />
      <Button
        className={cn(
          styles["button"],
          "w-8 m-px flex items-center justify-center",
          "ra-hover:text-primary-700 ra-pressed:text-primary-400",
        )}
      >
        <span className="codicon codicon-triangle-down" />
      </Button>

      <Popover
        className={cn(styles["popover"], popoverClassName)}
        containerPadding={0}
      >
        <ListBox className="max-h-96 overflow-auto outline-none">
          {items.map((item) => (
            <Item
              key={item.key}
              id={item.key}
              textValue={item.value ?? item.key}
              className={cn(
                "px-2 py-1 ra-selected:font-semibold",
                "outline-none ra-focus:bg-primary-100 ra-pressed:bg-primary-100",
              )}
            >
              {item.value ?? item.key}
            </Item>
          ))}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}

export interface AppComboBoxState {
  selectedKey: string | null;
  inputValue: string;
  handleOnSelectionChange: (key: React.Key | null) => void;
  handleOnInputChange: (value: string) => void;
}

AppComboBox.useState = function useAppComboBoxState(
  items: ComboBoxItem[],
  defaultState?: Pick<AppComboBoxState, "selectedKey" | "inputValue">,
): AppComboBoxState {
  const [state, setState] = useState(
    defaultState ?? { selectedKey: null, inputValue: "" },
  );

  const handleOnSelectionChange = useEventCallback((key: React.Key | null) => {
    if (key != null && typeof key !== "string") {
      return;
    }
    setState((s) => ({
      inputValue:
        key == null
          ? s.inputValue
          : items.find((i) => i.key === key)?.value ?? key,
      selectedKey: key,
    }));
  });

  const handleOnInputChange = useEventCallback((value: string) => {
    setState((s) => ({
      inputValue: value,
      selectedKey: value === "" ? null : s.selectedKey,
    }));
  });

  return useMemo<AppComboBoxState>(
    () => ({ ...state, handleOnSelectionChange, handleOnInputChange }),
    [state, handleOnSelectionChange, handleOnInputChange],
  );
};
