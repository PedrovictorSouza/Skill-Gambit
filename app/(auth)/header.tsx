"use client";
import { useState } from "react";

import {
  ClerkLoaded,
  ClerkLoading,
  SignInButton,
  Show,
  useAuth,
} from "@clerk/nextjs";
import { Loader } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import Banner from "@/components/banner";
import { useDemoMode } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { links } from "@/config";
import { cn } from "@/lib/utils";

export const Header = () => {
  const demoMode = useDemoMode();
  const [hideBanner, setHideBanner] = useState(true);

  return (
    <>
      <Banner hide={hideBanner} setHide={setHideBanner} />

      <header
        className={cn(
          "h-20 w-full border-b-2 border-slate-200 px-4",
          !hideBanner ? "mt-20 sm:mt-16 lg:mt-10" : "mt-0"
        )}
      >
        <div className="flex h-full items-center justify-between">
          <Link href="/" className="flex items-center gap-x-3 pb-7 pl-4 pt-8">
            <Image src="/mascot.svg" alt="Mascot" height={40} width={40} />

            <h1 className="text-2xl font-extrabold tracking-wide text-green-600">
              QuizItAll
            </h1>
          </Link>

          <div className="flex gap-x-3">
            {demoMode ? <DemoActions /> : <AuthenticatedActions />}
          </div>
        </div>
      </header>
    </>
  );
};

const DemoActions = () => {
  return (
    <>
      <Button size="lg" variant="ghost" asChild>
        <Link href="/learn">Open Demo</Link>
      </Button>

      <Link
        href={links.sourceCode}
        target="_blank"
        rel="noreferrer noopener"
        className="pt-3"
      >
        <Image src="/github.svg" alt="Source Code" height={20} width={20} />
      </Link>
    </>
  );
};

const AuthenticatedActions = () => {
  const { isSignedIn } = useAuth();

  return (
    <>
      <ClerkLoading>
        <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
      </ClerkLoading>

      <ClerkLoaded>
        <Show when="signed-out">
          <SignInButton>
            <Button size="lg" variant="ghost">
              Login
            </Button>
          </SignInButton>
        </Show>

        <Link
          href={links.sourceCode}
          target="_blank"
          rel="noreferrer noopener"
          className={isSignedIn ? "pt-1.5" : "pt-3"}
        >
          <Image src="/github.svg" alt="Source Code" height={20} width={20} />
        </Link>
      </ClerkLoaded>
    </>
  );
};
