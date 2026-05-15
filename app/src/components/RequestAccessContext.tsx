"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type RequestAccessContextType = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const RequestAccessContext = createContext<RequestAccessContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
});

export function RequestAccessProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <RequestAccessContext.Provider
      value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}
    >
      {children}
    </RequestAccessContext.Provider>
  );
}

export function useRequestAccess() {
  return useContext(RequestAccessContext);
}
