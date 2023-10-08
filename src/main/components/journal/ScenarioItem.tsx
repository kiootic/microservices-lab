import cn from "clsx";
import React from "react";
import { Item } from "react-aria-components";
import { Scenario } from "../../model/scenarios";

interface ScenarioItemProps {
  scenario: Scenario;
}

export const ScenarioItem: React.FC<ScenarioItemProps> = (props) => {
  const { scenario } = props;

  return (
    <Item
      id={"scenario:" + scenario.key}
      textValue={scenario.name}
      className={cn(
        "cursor-pointer ra-hover:bg-gray-200",
        "outline-none ring-inset ra-focus-visible:ring-1 ra-focus-visible:bg-gray-100",
      )}
    >
      <span
        className="w-full flex justify-between px-4 py-2 truncate"
        title={scenario.name}
      >
        {scenario.name}
      </span>
    </Item>
  );
};
