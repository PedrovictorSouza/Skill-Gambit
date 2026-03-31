"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const PragtCssTool = dynamic(
  () => import("@/packages/pragt-css/src/react/index.js").then((module) => module.PragtCssTool),
  {
    ssr: false,
  }
);

const PRAGT_TOGGLE_KEY = "s";
const PANEL_DOCK_SIDE_STORAGE_KEY = "pragt-panel-dock-side-v1";

export default function PragtToolMount() {
  const [enabled, setEnabled] = useState(false);
  const [panelDockSide, setPanelDockSide] = useState("right");

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || enabled) {
      return;
    }

    const handleGlobalShortcut = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === PRAGT_TOGGLE_KEY) {
        event.preventDefault();
        setEnabled(true);
      }
    };

    document.addEventListener("keydown", handleGlobalShortcut);

    return () => {
      document.removeEventListener("keydown", handleGlobalShortcut);
    };
  }, [enabled]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || typeof window === "undefined" || enabled) {
      return;
    }

    const storedDockSide = window.localStorage.getItem(PANEL_DOCK_SIDE_STORAGE_KEY);

    if (storedDockSide === "left" || storedDockSide === "right") {
      setPanelDockSide(storedDockSide);
    }
  }, [enabled]);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  if (!enabled) {
    return (
      <div
        className={`pragt-specificity-tool${panelDockSide === "left" ? " is-left" : ""}`}
        style={{ zIndex: 2147483647 }}
      >
        <button
          type="button"
          className="pragt-specificity-launcher"
          onClick={() => setEnabled(true)}
        >
          PRAGT CSS
        </button>
      </div>
    );
  }

  return <PragtCssTool initialOpen onRequestClose={() => setEnabled(false)} />;
}
