"use client";

import {
  ClerkLoaded,
  ClerkLoading,
  SignInButton,
  Show,
  UserButton,
} from "@clerk/nextjs";
import { Loader } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { useDemoMode } from "@/components/providers/app-provider";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SidebarItem } from "./sidebar-item";

type SidebarProps = {
  className?: string;
};

export const Sidebar = ({ className }: SidebarProps) => {
  const demoMode = useDemoMode();

  return (
    <div
      className={cn(
        "left-0 top-0 flex h-full flex-col border-r-2 px-4 lg:fixed lg:w-[256px]",
        className
      )}
    >
      <Link href="/">
        <div className="flex items-center gap-x-3 pb-7 pl-4 pt-8">
          <Image src="/mascot.svg" alt="Mascot" height={40} width={40} />

          <h1 className="text-2xl font-extrabold tracking-wide text-green-600">
            QuizItAll
          </h1>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-y-2">
        <SidebarItem label="Learn" href="/learn" iconSrc="/learn.svg" />
        <SidebarItem
          label="Library"
          href="/courses"
          iconSrc="/leaderboard.svg"
        />
        <SidebarItem label="Create" href="/create" iconSrc="/create.svg" />
        <SidebarItem label="Quests" href="/quests" iconSrc="/quests.svg" />
      </div>

      <div className="p-4">
        {demoMode ? (
          <div className="flex items-center gap-x-3 rounded-xl border-2 p-3">
            <Avatar className="h-10 w-10 border bg-green-500">
              <AvatarImage src="/mascot.svg" className="object-cover" />
            </Avatar>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-neutral-800">
                Demo Learner
              </p>
              <p className="text-xs text-muted-foreground">Frontend-only mode</p>
            </div>
          </div>
        ) : (
          <>
            <ClerkLoading>
              <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
            </ClerkLoading>

            <ClerkLoaded>
              <Show when="signed-in">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonPopoverCard: { pointerEvents: "initial" },
                    },
                  }}
                />
              </Show>

              <Show when="signed-out">
                <SignInButton mode="modal">
                  <Button variant="secondary" className="w-full">
                    Sign in
                  </Button>
                </SignInButton>
              </Show>
            </ClerkLoaded>
          </>
        )}
      </div>
    </div>
  );
};
