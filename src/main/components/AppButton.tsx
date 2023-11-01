import React from "react";
import cn from "clsx";
import { Button, ButtonProps } from "react-aria-components";

interface AppButtonProps extends ButtonProps {
  className?: string;
  variant: "destructive" | "secondary" | "link";
}

export const AppButton: React.FC<AppButtonProps> = (props) => {
  const { className, variant, ...rest } = props;

  return (
    <Button
      className={cn(
        "h-9 px-4 min-w-[6rem] inline-flex text-center items-center justify-center",
        "rounded outline-none ra-focus-visible:ring-2 ring-offset-2",
        variant === "secondary" &&
          "border border-gray-500 ra-hover:bg-gray-200 ra-pressed:bg-gray-300 ra-focus-visible:bg-gray-100 ring-gray-300",
        variant === "destructive" &&
          "text-gray-50 bg-red-800 ra-hover:bg-red-700 ra-pressed:bg-red-900 ring-red-300",
        variant === "link" && "ra-hover:bg-gray-200 ra-pressed:bg-gray-300",
        className,
      )}
      {...rest}
    />
  );
};
