import React from "react";
import ReactDOM from "react-dom/client";
import PragtCssTool from "../react/PragtCssTool.jsx";

const PRAGT_BOOTSTRAP_ATTR = "data-pragt-css-bootstrap-root";

export function initPragtCssTool(options = {}) {
  if (typeof document === "undefined") {
    return null;
  }

  let mountNode = document.querySelector(`[${PRAGT_BOOTSTRAP_ATTR}]`);

  if (!mountNode) {
    mountNode = document.createElement("div");
    mountNode.setAttribute(PRAGT_BOOTSTRAP_ATTR, "true");
    document.body.appendChild(mountNode);
  }

  const root = ReactDOM.createRoot(mountNode);
  root.render(React.createElement(PragtCssTool, options));

  return {
    root,
    mountNode,
    destroy() {
      root.unmount();

      if (mountNode.parentNode) {
        mountNode.parentNode.removeChild(mountNode);
      }
    }
  };
}
