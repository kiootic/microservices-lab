import React, { Dispatch, SetStateAction, useContext } from "react";

export interface NavContext {
  label: string;
  useCompactLayout: boolean;
  isNavOpened: boolean;
  setIsNavOpened: Dispatch<SetStateAction<boolean>>;
}

export const NavContext = React.createContext<NavContext>({
  label: "",
  useCompactLayout: false,
  isNavOpened: false,
  setIsNavOpened: () => {},
});

export function useNavContext() {
  return useContext(NavContext);
}
