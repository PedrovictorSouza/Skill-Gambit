import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const Promo = () => {
  return (
    <div className="space-y-4 rounded-xl border-2 p-4">
      <div className="space-y-2">
        <div className="flex items-center gap-x-2">
          <Image src="/create.svg" alt="Create" height={26} width={26} />

          <h3 className="text-lg font-bold">Create a new course</h3>
        </div>

        <p className="text-muted-foreground">
          Turn notes, PDFs and TXT files into a fresh study path.
        </p>
      </div>

      <Button variant="secondary" className="w-full" size="lg" asChild>
        <Link href="/create">Start from content</Link>
      </Button>
    </div>
  );
};
