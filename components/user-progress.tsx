import { InfinityIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Button } from "@/components/ui/button";

type UserProgressProps = {
  activeCourse: {
    title: string;
    imageSrc: string;
  };
  hearts: number;
  points: number;
  hasActiveSubscription: boolean;
  courseHref?: string | null;
  pointsHref?: string | null;
  heartsHref?: string | null;
};

const ButtonContent = ({
  className,
  children,
}: Pick<ComponentPropsWithoutRef<typeof Button>, "className"> & {
  children: ReactNode;
}) => (
  <Button variant="ghost" className={className}>
    {children}
  </Button>
);

const MaybeLink = ({
  href,
  children,
}: {
  href?: string | null;
  children: ReactNode;
}) => {
  if (!href) return <>{children}</>;

  return <Link href={href}>{children}</Link>;
};

export const UserProgress = ({
  activeCourse,
  hearts,
  points,
  hasActiveSubscription,
  courseHref = "/courses",
  pointsHref = "/shop",
  heartsHref = "/shop",
}: UserProgressProps) => {
  return (
    <div className="flex w-full items-center justify-between gap-x-2">
      <MaybeLink href={courseHref}>
        <ButtonContent>
          <Image
            src={activeCourse.imageSrc}
            alt={activeCourse.title}
            className="rounded-md border"
            width={32}
            height={32}
          />
        </ButtonContent>
      </MaybeLink>

      <MaybeLink href={pointsHref}>
        <ButtonContent className="text-orange-500">
          <Image
            src="/points.svg"
            height={28}
            width={28}
            alt="Points"
            className="mr-2"
          />
          {points}
        </ButtonContent>
      </MaybeLink>

      <MaybeLink href={heartsHref}>
        <ButtonContent className="text-rose-500">
          <Image
            src="/heart.svg"
            height={22}
            width={22}
            alt="Hearts"
            className="mr-2"
          />
          {hasActiveSubscription ? (
            <InfinityIcon className="stroke-3 h-4 w-4" />
          ) : (
            hearts
          )}
        </ButtonContent>
      </MaybeLink>
    </div>
  );
};
