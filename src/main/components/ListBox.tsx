import cn from "clsx";
import React, { useImperativeHandle, useMemo } from "react";
import {
  AriaListBoxProps,
  mergeProps,
  useFocusRing,
  useHover,
  useListBox,
  useOption,
} from "react-aria";
import { Item, ItemProps, ListState, Node, useListState } from "react-stately";
import { useForwardedRef } from "../hooks/ref";

interface ListBoxProps<T> extends Omit<AriaListBoxProps<T>, "items"> {
  className?: string;
  children: React.ReactElement[];
  stateRef?: React.RefObject<ListState<T>>;
}

const ListBox = React.forwardRef(function ListBox<T extends object>(
  props: ListBoxProps<T>,
  forwardedRef: React.ForwardedRef<HTMLUListElement>,
) {
  const { className, stateRef } = props;
  const ref = useForwardedRef(forwardedRef);

  const state = useListState<T>(props);
  const { listBoxProps } = useListBox(props, state, ref);
  useImperativeHandle(stateRef, () => state, [state]);

  const { focusProps, isFocused, isFocusVisible } = useFocusRing();

  const children = useMemo(() => {
    const elements: React.ReactElement[] = [];
    for (const item of state.collection) {
      elements.push(<Option state={state} key={item.key} item={item} />);
    }
    return elements;
  }, [state]);

  return (
    <ul
      {...mergeProps(listBoxProps, focusProps)}
      ref={ref}
      className={cn("outline-none", className)}
      data-empty={state.collection.size === 0 || undefined}
      data-focused={isFocused || undefined}
      data-focus-visible={isFocusVisible || undefined}
    >
      {children}
    </ul>
  );
});

interface OptionProps<T> {
  state: ListState<T>;
  item: Node<T>;
}

function Option<T extends object>({ state, item }: OptionProps<T>) {
  const ref = React.createRef<HTMLLIElement>();
  const option = useOption({ key: item.key }, state, ref);

  const { hoverProps, isHovered } = useHover({
    isDisabled: !option.allowsSelection && !option.hasAction,
  });

  const { className, ...rest } = mergeProps(option.optionProps, hoverProps);

  return (
    <li
      {...rest}
      className={cn(className, item.props.className)}
      ref={ref}
      data-selected={option.isSelected || undefined}
      data-disabled={option.isDisabled || undefined}
      data-hovered={isHovered || undefined}
      data-focused={option.isFocused || undefined}
      data-focus-visible={option.isFocusVisible || undefined}
      data-pressed={option.isPressed || undefined}
    >
      {item.rendered}
    </li>
  );
}

const ListBox_ = Object.assign(
  ListBox as <T>(
    props: ListBoxProps<T> & React.RefAttributes<HTMLUListElement>,
  ) => React.ReactElement,
  {
    Item: Item as <T>(
      props: ItemProps<T> & { className?: string },
    ) => React.ReactElement,
  },
);

export { ListBox_ as ListBox };
