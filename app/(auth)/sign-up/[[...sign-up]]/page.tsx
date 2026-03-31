import Link from "next/link";

import { SignUp } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { isDemoMode } from "@/lib/demo-mode";

const SignUpPage = () => {
  if (isDemoMode) {
    return (
      <div className="mx-4 w-full max-w-md rounded-2xl border-2 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-neutral-800">Demo mode active</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Account creation is disabled. Open the interface directly with mock data.
        </p>

        <Button className="mt-6 w-full" size="lg" asChild>
          <Link href="/learn">Open demo app</Link>
        </Button>
      </div>
    );
  }

  return <SignUp />;
};

export default SignUpPage;
