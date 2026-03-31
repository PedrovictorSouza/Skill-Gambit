"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

type GalleryItem = {
  title: string;
  description: string;
  image: StaticImageData;
};

type GalleryCarouselProps = {
  items: readonly GalleryItem[];
};

const titleClassName = "pirata-one-regular font-normal tracking-[0.03em]";
const eyebrowClassName =
  "text-[1.09375rem] font-bold uppercase tracking-[0.16em] text-[#c8a873]";
const titleSizeClassName = "text-[1.875rem] text-white";
const bodyClassName =
  "text-[1.09375rem] leading-[1.875rem] text-white/70 sm:text-[1.25rem]";

export const GalleryCarousel = ({ items }: GalleryCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentItem = items[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((index) => (index - 1 + items.length) % items.length);
  };

  const goToNext = () => {
    setCurrentIndex((index) => (index + 1) % items.length);
  };

  return (
    <div className="mt-10 space-y-5">
      <article className="overflow-hidden rounded-[28px] border border-white/10 bg-[#121111]">
        <div
          key={currentItem.title}
          className="relative h-[100vh] min-h-[100vh] w-full animate-[hero-stagger-fade-in_0.45s_ease]"
        >
          <Image
            src={currentItem.image}
            alt={currentItem.title}
            fill
            priority={currentIndex === 0}
            sizes="100vw"
            className="object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,9,8,0.08)_0%,rgba(10,9,8,0.22)_52%,rgba(10,9,8,0.82)_100%)]" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 sm:p-6">
            <div className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-white/70 backdrop-blur-md">
              {String(currentIndex + 1).padStart(2, "0")} /{" "}
              {String(items.length).padStart(2, "0")}
            </div>

            <div className="flex items-center gap-2">
              <button
                aria-label="Previous gallery slide"
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-white/15 bg-black/35 px-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
                onClick={goToPrevious}
                type="button"
              >
                Prev
              </button>
              <button
                aria-label="Next gallery slide"
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-white/15 bg-black/35 px-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
                onClick={goToNext}
                type="button"
              >
                Next
              </button>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <p className={eyebrowClassName}>
              Gallery {String(currentIndex + 1).padStart(2, "0")}
            </p>
            <h3 className={cn("mt-3", titleSizeClassName, titleClassName)}>
              {currentItem.title}
            </h3>
            <p className={cn("mt-2 max-w-2xl", bodyClassName)}>
              {currentItem.description}
            </p>
          </div>
        </div>
      </article>

      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => {
          const isActive = index === currentIndex;

          return (
            <button
              key={item.title}
              aria-label={`Go to ${item.title}`}
              aria-pressed={isActive}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] transition",
                isActive
                  ? "bg-[#c8a873]/14 border-[#c8a873]/40 text-[#f5e7c7]"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.08] hover:text-white"
              )}
              onClick={() => setCurrentIndex(index)}
              type="button"
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span>{item.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
