import type { PropsWithChildren } from "react";

const MarketingLayout = ({ children }: PropsWithChildren) => {
  return (
    <main className="bellefair-regular flex min-h-screen flex-1 flex-col">
      {children}
    </main>
  );
};

export default MarketingLayout;
