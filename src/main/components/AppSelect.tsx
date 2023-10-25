import cn from "clsx";
import {
  Button,
  Item,
  ListBox,
  Popover,
  Select,
  SelectProps,
  SelectValue,
} from "react-aria-components";
import styles from "./AppSelect.module.css";

export interface SelectItem {
  key: string;
  text?: string;
}

interface AppSelectProps
  extends Omit<SelectProps<object>, "items" | "defaultItems" | "children"> {
  className?: string;
  popoverClassName?: string;
  items: SelectItem[];
}

export function AppSelect(props: AppSelectProps) {
  const { className, popoverClassName, items, ...rest } = props;

  return (
    <Select className={cn(styles["root"], className)} {...rest}>
      <Button
        className={cn(
          styles["button"],
          "m-px w-full flex items-center",
          "outline-none",
        )}
      >
        <SelectValue className={cn("flex-1 truncate px-2 py-1")} />
        <span
          className={cn(
            styles["chevron"],
            "flex-none w-8 flex items-center justify-center",
          )}
        >
          <span className="codicon codicon-triangle-down" />
        </span>
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
              textValue={item.text ?? item.key}
              className={cn(
                "px-2 py-1 ra-selected:font-semibold",
                "outline-none ra-focus:bg-primary-100 ra-pressed:bg-primary-100",
              )}
            >
              {item.text ?? item.key}
            </Item>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
