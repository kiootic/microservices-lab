import React from "react";
import cn from "clsx";
import {
  Dialog,
  Modal,
  ModalOverlay,
  DialogTrigger,
  DialogProps,
  ModalOverlayProps,
  Heading,
  HeadingProps,
} from "react-aria-components";

const AppDialog: React.FC<DialogProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <Dialog
      className={cn("flex flex-col gap-y-4 outline-none", className)}
      {...rest}
    />
  );
};

const AppModalOverlay: React.FC<ModalOverlayProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <ModalOverlay
      className={cn(
        "fixed inset-0 w-screen h-[--visual-viewport-height]",
        "flex items-center justify-center p-4",
        "ra-entering:animate-fade-in ra-exiting:animate-fade-out",
        "bg-gray-200/70",
        className,
      )}
      {...rest}
    />
  );
};

const AppModal: React.FC<ModalOverlayProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <Modal
      className={cn(
        "rounded-lg bg-gray-50 shadow-lg",
        "px-6 py-5 w-96 min-w-min max-w-full",
        className,
      )}
      {...rest}
    />
  );
};

const AppDialogHeading: React.FC<HeadingProps> = (props) => {
  const { className, ...rest } = props;

  return <Heading className={cn("text-lg", className)} {...rest} />;
};

interface AppDialogActionsProps extends React.PropsWithChildren {
  className?: string;
}

const AppDialogActions: React.FC<AppDialogActionsProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <div
      className={cn("flex items-center justify-end gap-x-5", className)}
      {...rest}
    />
  );
};

const AppDialog_ = Object.assign(AppDialog, {
  Trigger: DialogTrigger,
  Modal: AppModal,
  ModalOverlay: AppModalOverlay,
  Heading: AppDialogHeading,
  Actions: AppDialogActions,
});

export { AppDialog_ as AppDialog };
