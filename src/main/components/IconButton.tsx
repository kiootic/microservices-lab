import React from "react";
import cn from "clsx";
import { Button, ButtonProps } from "react-aria-components";

interface IconButtonProps extends ButtonProps {
  className?: string;
}

export const IconButton: React.FC<IconButtonProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <Button
      className={cn(
        "w-8 h-8 inline-flex items-center justify-center",
        "rounded ra-hover:bg-gray-200 ra-pressed:bg-gray-300",
        "outline-none ra-focus-visible:bg-gray-100 ra-focus-visible:ring-1",
        className,
      )}
      {...rest}
    />
  );
};
