import cn from "clsx";
import React, { useMemo, useState } from "react";
import { Tab, TabList, TabPanel, TabProps, Tabs } from "react-aria-components";
import { FormattedMessage } from "react-intl";
import { useEventCallback } from "../../hooks/event-callback";
import { useSize } from "../../hooks/resize";
import { NavContext, useNavContext } from "./context";

const compactLayoutThreshold = 768;
const tabNav = "nav";
const tabContent = "content";

interface NavViewProps extends React.PropsWithChildren {
  className?: string;
  label: string;
}

const NavView: React.FC<NavViewProps> = (props) => {
  const { className, label, children } = props;

  const [isNavOpened, setIsNavOpened] = useState(false);
  const [element, setElement] = useState<HTMLElement | null>(null);
  const useCompactLayout = useSize(element, (w) => w < compactLayoutThreshold);

  const context = useMemo<NavContext>(
    () => ({
      label,
      useCompactLayout: useCompactLayout ?? false,
      isNavOpened,
      setIsNavOpened: (value) =>
        setIsNavOpened(useCompactLayout ? value : false),
    }),
    [label, useCompactLayout, isNavOpened],
  );

  if (isNavOpened && !useCompactLayout) {
    setIsNavOpened(false);
  }

  const selectedKey = isNavOpened && useCompactLayout ? tabNav : tabContent;

  const handleOnSelectionChange = useEventCallback((key: React.Key) => {
    setIsNavOpened(key === tabNav);
  });

  return (
    <NavContext.Provider value={context}>
      <div ref={setElement} className={className}>
        {useCompactLayout === true ? (
          <Tabs
            className="w-full h-full"
            isDisabled={!useCompactLayout}
            keyboardActivation="manual"
            selectedKey={selectedKey}
            onSelectionChange={handleOnSelectionChange}
          >
            <div className="w-full h-full relative flex">{children}</div>
          </Tabs>
        ) : null}
        {useCompactLayout === false ? (
          <div className="w-full h-full relative flex">{children}</div>
        ) : null}
      </div>
    </NavContext.Provider>
  );
};

const NavTabButton: React.FC<React.PropsWithChildren<TabProps>> = (props) => {
  const { className, children, id, ...rest } = props;
  const { isNavOpened } = useNavContext();
  const isNav = id === tabNav;
  const isSelected = isNavOpened === isNav;

  return (
    <Tab
      className={cn(
        "absolute top-1 left-1 w-10 h-10",
        "inline-flex items-center justify-center",
        "rounded z-20 cursor-pointer",
        isNav ? "border" : "text-primary-500",
        "bg-gray-100/80 ra-hover:bg-gray-200/80 ra-pressed:bg-gray-300/80",
        "outline-none ring-offset-1 ra-focus-visible:bg-gray-100/80 ra-focus-visible:ring-1",
        isSelected && "hidden",
        className,
      )}
      id={id}
      {...rest}
    >
      <span className="codicon codicon-menu" />
      <span className="sr-only">{children}</span>
    </Tab>
  );
};

interface NavProps extends React.PropsWithChildren {
  className?: string;
}

const Nav: React.FC<NavProps> = (props) => {
  const { className, children } = props;

  const { label, useCompactLayout } = useNavContext();

  return useCompactLayout ? (
    <>
      <TabList aria-label={label}>
        <NavTabButton id={tabNav}>
          <FormattedMessage
            id="components.nav.navigation"
            defaultMessage="Navigation"
          />
        </NavTabButton>
        <NavTabButton id={tabContent}>
          <FormattedMessage
            id="components.nav.content"
            defaultMessage="Content"
          />
        </NavTabButton>
      </TabList>
      <TabPanel
        className={cn(
          "absolute inset-0 z-10 bg-gray-100 data-[inert]:hidden",
          className,
        )}
        id={tabNav}
        shouldForceMount={true}
      >
        {children}
      </TabPanel>
    </>
  ) : (
    <div className={cn("flex-none w-64 border-r-2", className)}>{children}</div>
  );
};

interface ContentProps extends React.PropsWithChildren {
  className?: string;
}

const Content: React.FC<ContentProps> = (props) => {
  const { className, children } = props;
  const { useCompactLayout } = useNavContext();

  return useCompactLayout ? (
    <TabPanel
      className={cn("flex-1 min-w-0", className)}
      id={tabContent}
      shouldForceMount={true}
    >
      {children}
    </TabPanel>
  ) : (
    children
  );
};

const NavView_ = Object.assign(NavView, { Nav, Content });
export { NavView_ as NavView };
