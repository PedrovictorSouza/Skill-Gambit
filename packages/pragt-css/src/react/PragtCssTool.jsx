"use client";

import PragtSpecificityTool from "./PragtSpecificityTool.jsx";

export default function PragtCssTool(props) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return <PragtSpecificityTool {...props} />;
}
