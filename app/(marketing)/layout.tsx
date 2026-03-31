import type { PropsWithChildren } from "react";

import "../../packages/pragt-css/src/styles/pragt-specificity-tool.css";
import PragtToolMount from "./PragtToolMount";
import "./pragt-overrides.css";

const MarketingLayout = ({ children }: PropsWithChildren) => {
  return (
    <main className="bellefair-regular flex min-h-screen flex-1 flex-col">
      {children}
      <PragtToolMount />
    </main>
  );
};

export default MarketingLayout;
