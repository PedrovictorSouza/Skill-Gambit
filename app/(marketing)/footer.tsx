import Image from "next/image";

import { Button } from "@/components/ui/button";

export const Footer = () => {
  return (
    <div className="hidden h-16 w-full border-t-2 border-slate-200 px-2 py-1 2xl:block">
      <div className="mx-auto flex h-full max-w-screen-lg items-center justify-evenly">
        <Button size="sm" variant="ghost" className="w-full cursor-default">
          <Image
            src="/hr.svg"
            alt="Croatian"
            height={24}
            width={30}
            className="mr-4 rounded-md"
          />
          Croatian
        </Button>

        <Button size="sm" variant="ghost" className="w-full cursor-default">
          <Image
            src="/es.svg"
            alt="Spanish"
            height={24}
            width={30}
            className="mr-4 rounded-md"
          />
          Spanish
        </Button>

        <Button size="sm" variant="ghost" className="w-full cursor-default">
          <Image
            src="/fr.svg"
            alt="French"
            height={24}
            width={30}
            className="mr-4 rounded-md"
          />
          French
        </Button>

        <Button size="sm" variant="ghost" className="w-full cursor-default">
          <Image
            src="/it.svg"
            alt="Italian"
            height={24}
            width={30}
            className="mr-4 rounded-md"
          />
          Italian
        </Button>

        <Button size="sm" variant="ghost" className="w-full cursor-default">
          <Image
            src="/jp.svg"
            alt="Japanese"
            height={24}
            width={30}
            className="mr-4 rounded-md"
          />
          Japanese
        </Button>
      </div>
    </div>
  );
};
