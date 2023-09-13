import cn from "clsx";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { mergeProps, useHover, useMove } from "react-aria";
import { useForwardedRef } from "../hooks/ref";
import styles from "./SplitLayout.module.css";

interface SplitLayoutProps {
  className?: string;
  initialPaneASize?: string;
  minSize?: string;
  paneA: React.ReactNode;
  paneB: React.ReactNode;
}

export const SplitLayout = React.forwardRef<HTMLDivElement, SplitLayoutProps>(
  (props, forwardedRef) => {
    const { className, minSize, initialPaneASize, paneA, paneB } = props;

    const rootRef = useForwardedRef(forwardedRef);
    const paneARef = useRef<HTMLDivElement>(null);

    const rootStyle = useMemo<React.CSSProperties>(
      () =>
        ({
          "--layout-min-pane-size": minSize ?? "0px",
          "--layout-initial-pane-size": initialPaneASize ?? "50%",
        }) as React.CSSProperties,
      [minSize, initialPaneASize],
    );

    const moveXRef = useRef(0);
    const updatePaneSize = (root: HTMLElement) => {
      let percentage = (100 * moveXRef.current) / root.clientWidth;
      percentage = Math.max(0, Math.min(100, percentage));
      const value = isNaN(percentage) ? "" : percentage.toFixed(3) + "%";

      root.style.setProperty("--layout-pane-size", value);
    };

    const [isMoving, setIsMoving] = useState(false);
    const dividerMove = useMove({
      onMoveStart() {
        moveXRef.current = paneARef.current?.clientWidth ?? 0;
        setIsMoving(true);
      },
      onMove(e) {
        moveXRef.current += e.deltaX;
        if (rootRef.current != null) {
          updatePaneSize(rootRef.current);
        }
      },
      onMoveEnd() {
        if (rootRef.current != null) {
          updatePaneSize(rootRef.current);
        }
        setIsMoving(false);
      },
    });

    const [isHovering, setIsHovering] = useState(false);
    const dividerHover = useHover({ isDisabled: isMoving });
    useEffect(() => {
      if (dividerHover.isHovered) {
        const handle = setTimeout(() => setIsHovering(true), 500);
        return () => clearTimeout(handle);
      }
      setIsHovering(false);
    }, [dividerHover.isHovered]);

    const isActive = isHovering || isMoving;

    return (
      <div
        ref={rootRef}
        className={cn(styles["root"], className)}
        style={rootStyle}
        {...(isActive ? { "data-active": "" } : {})}
      >
        <div ref={paneARef} className={styles["pane-a"]}>
          {paneA}
        </div>
        <div className={styles["pane-b"]}>{paneB}</div>
        <div
          className={styles["divider"]}
          {...mergeProps(dividerHover.hoverProps, dividerMove.moveProps)}
        />
      </div>
    );
  },
);
