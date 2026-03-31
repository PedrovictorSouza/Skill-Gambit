import { GalleryCarousel } from "./gallery-carousel";
import { HeroFireBackground } from "@/components/hero-fire-background";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  bosses,
  coreLoop,
  ctaContent,
  featureCards,
  galleryItems,
  heroContent,
  overviewContent,
  socialLinks,
} from "./content";

const titleClassName = "pirata-one-regular font-normal tracking-[0.03em]";
const ctaClassName = "pirata-one-regular font-normal tracking-[0.08em]";
const sectionEyebrowClassName =
  "text-[1.09375rem] font-bold uppercase tracking-[0.18em] text-[#c8a873]";
const sectionCardEyebrowClassName =
  "text-[1.09375rem] font-bold uppercase tracking-[0.16em] text-[#c8a873]";
const sectionBadgeClassName =
  "text-[1.09375rem] font-bold uppercase tracking-[0.12em]";
const sectionIntroTitleClassName =
  "text-[2.34375rem] text-white sm:text-[2.8125rem] lg:text-[3.75rem]";
const sectionIntroDescriptionClassName =
  "max-w-[60ch] text-[1.25rem] leading-[2.1875rem] text-white/70 lg:text-[1.40625rem]";
const sectionIntroSupportingClassName =
  "max-w-[60ch] text-[1.09375rem] leading-[2.1875rem] text-white/52 lg:text-[1.25rem]";
const sectionTitleLargeClassName = "text-[1.875rem] text-white";
const sectionTitleMediumClassName = "text-[1.5625rem] text-white";
const sectionTitleSmallClassName = "text-[1.40625rem] text-white";
const sectionBodyClassName = "text-[1.09375rem] leading-[1.875rem]";
const sectionBodyProminentClassName = "text-[1.25rem] leading-[2rem]";

type SectionIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  supportingText?: string;
  align?: "left" | "center";
};

const SectionIntro = ({
  eyebrow,
  title,
  description,
  supportingText,
  align = "left",
}: SectionIntroProps) => {
  return (
    <div
      className={cn(
        "space-y-4",
        align === "center" && "mx-auto max-w-3xl text-center"
      )}
    >
      <p className={sectionEyebrowClassName}>{eyebrow}</p>
      <h2 className={cn(sectionIntroTitleClassName, titleClassName)}>
        {title}
      </h2>
      <p className={sectionIntroDescriptionClassName}>{description}</p>
      {supportingText ? (
        <p className={sectionIntroSupportingClassName}>{supportingText}</p>
      ) : null}
    </div>
  );
};

type PlaceholderPanelProps = {
  label: string;
  title: string;
  description: string;
  className?: string;
};

const PlaceholderPanel = ({
  label,
  title,
  description,
  className,
}: PlaceholderPanelProps) => {
  return (
    <article
      className={cn(
        "rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]",
        className
      )}
    >
      <p className={sectionCardEyebrowClassName}>{label}</p>
      <div className="mt-4 rounded-[22px] border border-dashed border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] px-4 py-10 text-center">
        <p className={cn(sectionTitleSmallClassName, titleClassName)}>
          {title}
        </p>
        <p
          className={cn(
            "mx-auto mt-2 max-w-sm text-white/55",
            sectionBodyClassName
          )}
        >
          {description}
        </p>
      </div>
    </article>
  );
};

export default function MarketingPage() {
  return (
    <div className="bg-[#0a0908] text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(180deg,#120f0d_0%,#090909_100%)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(200,168,115,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.06),_transparent_24%)]" />

        <div className="relative mx-auto flex max-w-7xl flex-col px-6 py-8 sm:px-8 lg:min-h-screen lg:px-10 lg:py-10 xl:px-14">
          <div className="relative z-20 flex items-center justify-between border-b border-white/10">
            <a
              href="#top"
              className={cn(
                "text-base uppercase text-[#f5e7c7]",
                ctaClassName,
                "tracking-[0.12em]"
              )}
            >
              {heroContent.studio}
            </a>

            <nav
              aria-label="Page sections"
              className="hidden items-center gap-5 text-sm font-bold uppercase tracking-[0.12em] text-white/45 lg:flex"
            >
              <a href="#overview" className="transition hover:text-white">
                Game
              </a>
              <a href="#loop" className="transition hover:text-white">
                Core Loop
              </a>
              <a href="#boss-order" className="transition hover:text-white">
                Bosses
              </a>
              <a href="#final-cta" className="transition hover:text-white">
                Follow
              </a>
            </nav>
          </div>

          <div
            id="top"
            className="relative isolate z-10 flex flex-1 items-center overflow-hidden"
          >
            <div className="relative w-full max-w-4xl overflow-hidden rounded-[32px]">
              <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 h-screen w-screen overflow-hidden"
              >
                <HeroFireBackground className="opacity-95" />

                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,15,13,0.49)_0%,rgba(18,15,13,0.475)_38%,rgba(18,15,13,0.38)_60%,rgba(18,15,13,0.21)_82%,rgba(18,15,13,0.09)_100%)]" />
              </div>

              <div
                data-hero-card
                className="marketing-hero-card relative z-10 overflow-hidden"
              >
                <div className="hero-stagger relative z-10 space-y-8 lg:pr-[13rem] xl:pr-[14rem]">
                  <div className="hero-stagger space-y-5">
                    <p className="text-base font-bold uppercase tracking-[0.18em] text-white/45">
                      {heroContent.studio} presents
                    </p>
                    <div className="hero-stagger space-y-3">
                      <h1
                        className={cn(
                          "max-w-4xl text-5xl uppercase text-[#f6eddc] sm:text-6xl xl:text-7xl",
                          titleClassName,
                          "tracking-[0.05em]"
                        )}
                      >
                        {heroContent.title}
                      </h1>
                    </div>
                    <p className="text-white/72 w-full max-w-3xl text-[1.3em] leading-8 lg:w-[40vw] lg:max-w-[34rem]">
                      {heroContent.description}
                    </p>
                  </div>

                  <div className="hero-stagger flex flex-wrap gap-2">
                    {heroContent.stats.map((stat) => (
                      <span
                        key={stat}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-white/60"
                      >
                        {stat}
                      </span>
                    ))}
                  </div>

                  <div className="hero-stagger space-y-4">
                    <div className="bg-[#c8a873]/8 inline-flex items-center gap-3 rounded-full border border-[#c8a873]/20 px-4 py-2 text-sm font-bold uppercase tracking-[0.16em] text-[#e7cf9e]">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#c8a873]" />
                      Third-person action RPG
                    </div>

                    <div className="hero-stagger flex flex-col gap-3 sm:flex-row">
                      <Button
                        asChild
                        variant="ghost"
                        size="lg"
                        className={cn(
                          "border border-[#c8a873]/30 bg-[#c8a873] text-[#120f0d] hover:bg-[#d6be8e]",
                          ctaClassName
                        )}
                      >
                        <a href="#final-cta">Wishlist on Steam</a>
                      </Button>

                      <Button
                        asChild
                        variant="ghost"
                        size="lg"
                        className={cn(
                          "border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]",
                          ctaClassName
                        )}
                      >
                        <a href="#final-cta">Follow Development</a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main>
        <section
          id="overview"
          className="border-b border-white/10 px-6 py-20 sm:px-8 lg:px-10 xl:px-14"
        >
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <SectionIntro
              eyebrow={overviewContent.eyebrow}
              title={overviewContent.title}
              description={overviewContent.description}
              supportingText={overviewContent.supportingText}
            />

            <div className="grid gap-4">
              <PlaceholderPanel
                label="Featured Character"
                title="The Crusader"
                description="A hardened warrior defined by measured strikes, sorcery, and endurance under pressure."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-[24px] border border-white/10 bg-[#131110] p-5">
                  <p className={sectionCardEyebrowClassName}>Scope</p>
                  <p
                    className={cn(
                      "mt-3",
                      sectionTitleLargeClassName,
                      titleClassName
                    )}
                  >
                    1 hero. 6 bosses.
                  </p>
                  <p className={cn("mt-2 text-white/55", sectionBodyClassName)}>
                    A compact production scope with a strong gameplay identity.
                  </p>
                </article>

                <article className="rounded-[24px] border border-white/10 bg-[#131110] p-5">
                  <p className={sectionCardEyebrowClassName}>Tone</p>
                  <p
                    className={cn(
                      "mt-3",
                      sectionTitleLargeClassName,
                      titleClassName
                    )}
                  >
                    Dark, gritty fantasy
                  </p>
                  <p className={cn("mt-2 text-white/55", sectionBodyClassName)}>
                    Built to communicate weight, ritual, and hard-earned
                    mastery.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section
          id="loop"
          className="border-b border-white/10 bg-[#100e0d] px-6 py-20 sm:px-8 lg:px-10 xl:px-14"
        >
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              eyebrow="Core Loop"
              title="Every victory changes the map of future battles"
              description="Choose an encounter, survive it, absorb its power, and rethink the path ahead."
              align="center"
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {coreLoop.map((item) => (
                <article
                  key={item.step}
                  className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5"
                >
                  <p className={sectionEyebrowClassName}>Step {item.step}</p>
                  <h3
                    className={cn(
                      "mt-4",
                      sectionTitleMediumClassName,
                      titleClassName
                    )}
                  >
                    {item.title}
                  </h3>
                  <p className={cn("mt-3 text-white/55", sectionBodyClassName)}>
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="boss-order"
          className="border-b border-white/10 px-6 py-20 sm:px-8 lg:px-10 xl:px-14"
        >
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              eyebrow="Strategic Boss Order"
              title="Boss order is not flavor. It is the game’s central strategy."
              description="Defeating a boss grants a new ability that may be strong, neutral, or weak against the remaining encounters. The route through the game should feel like a tactical decision as much as a test of execution."
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {bosses.map((boss) => (
                <article
                  key={boss.name}
                  className="rounded-[28px] border border-white/10 bg-[#121111] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={sectionCardEyebrowClassName}>
                        {boss.label}
                      </p>
                      <h3
                        className={cn(
                          "mt-2",
                          sectionTitleLargeClassName,
                          titleClassName
                        )}
                      >
                        {boss.name}
                      </h3>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-white/45",
                        sectionBadgeClassName
                      )}
                    >
                      Encounter
                    </span>
                  </div>

                  <div
                    className={cn(
                      "mt-4 rounded-[22px] border border-dashed border-white/15 bg-white/[0.03] px-4 py-10 text-center font-bold uppercase tracking-[0.12em] text-white/40",
                      sectionBodyProminentClassName
                    )}
                  >
                    Boss portrait
                  </div>

                  <p className={cn("mt-4 text-white/60", sectionBodyClassName)}>
                    {boss.description}
                  </p>

                  <div
                    className={cn(
                      "mt-4 space-y-2 rounded-[20px] border border-white/10 bg-black/20 p-4",
                      sectionBodyClassName
                    )}
                  >
                    <p className="text-white/78">{boss.reward}</p>
                    <p className="text-white/48">{boss.matchup}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="features"
          className="border-b border-white/10 bg-[#0f0d0c] px-6 py-20 sm:px-8 lg:px-10 xl:px-14"
        >
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              eyebrow="Features"
              title="A small scope with a clear promise"
              description="These pillars define what Proving Grounds promises every time you step into an arena."
              align="center"
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((feature, index) => (
                <article
                  key={feature.title}
                  className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
                >
                  <p className={sectionEyebrowClassName}>
                    Feature {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3
                    className={cn(
                      "mt-4",
                      sectionTitleLargeClassName,
                      titleClassName
                    )}
                  >
                    {feature.title}
                  </h3>
                  <p className={cn("mt-3 text-white/55", sectionBodyClassName)}>
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="media"
          className="border-b border-white/10 px-6 py-20 sm:px-8 lg:px-10 xl:px-14"
        >
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              eyebrow="Media Gallery"
              title="A first look at the world of Proving Grounds"
              description="Key art, combat, character, and arena moments that shape the tone of the game."
            />

            <GalleryCarousel items={galleryItems} />
          </div>
        </section>

        <section
          id="final-cta"
          className="px-6 py-20 sm:px-8 lg:px-10 xl:px-14"
        >
          <div className="mx-auto max-w-7xl">
            <div className="border-[#c8a873]/18 rounded-[32px] border bg-[linear-gradient(145deg,rgba(200,168,115,0.08),rgba(255,255,255,0.02))] px-6 py-8 shadow-[0_32px_100px_rgba(0,0,0,0.26)] sm:px-8 lg:px-10">
              <SectionIntro
                eyebrow={ctaContent.eyebrow}
                title={ctaContent.title}
                description={ctaContent.description}
              />

              <div className="mt-8 flex flex-wrap gap-3">
                {socialLinks.map((label, index) => (
                  <Button
                    key={label}
                    asChild
                    variant="ghost"
                    size="lg"
                    className={cn(
                      index === 0
                        ? "border border-[#c8a873]/30 bg-[#c8a873] text-[#120f0d] hover:bg-[#d6be8e]"
                        : "border-white/12 border bg-white/[0.04] text-white hover:bg-white/[0.08]",
                      "text-[1.09375rem]",
                      ctaClassName
                    )}
                  >
                    <a href="#">{label}</a>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-6 text-sm text-white/40 sm:px-8 lg:px-10 xl:px-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className={ctaClassName}>{heroContent.studio}</p>
          <p className={titleClassName}>{heroContent.title}</p>
          <p>Made for a future Steam release.</p>
        </div>
      </footer>
    </div>
  );
}
