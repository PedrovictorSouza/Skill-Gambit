"use client";

import { createContext, useContext } from "react";

import { ClerkProvider } from "@clerk/nextjs";

type AppProviderProps = {
  children: React.ReactNode;
  demoMode: boolean;
};

const DemoModeContext = createContext(false);

export const useDemoMode = () => useContext(DemoModeContext);

export const AppProvider = ({ children, demoMode }: AppProviderProps) => {
  return (
    <DemoModeContext.Provider value={demoMode}>
      {demoMode ? (
        children
      ) : (
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#22C55E",
            },
          }}
          afterSignOutUrl="/"
        >
          {children}
        </ClerkProvider>
      )}
    </DemoModeContext.Provider>
  );
};
