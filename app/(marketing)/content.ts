import type { StaticImageData } from "next/image";

import image01 from "@/Images/Flag/Image01.png";
import image02 from "@/Images/Flag/Image02.png";
import image03 from "@/Images/Flag/Image03.png";
import image04 from "@/Images/Flag/Image04.png";
import image05 from "@/Images/Flag/Image05.png";
import image06 from "@/Images/Flag/Image06.png";
import image07 from "@/Images/Flag/Image07.png";
import image08 from "@/Images/Flag/Image08.png";
import image09 from "@/Images/Flag/Image09.png";
import image10 from "@/Images/Flag/Image10.png";

import copy from "./copy.json";

export const heroContent = {
  studio: "Skill Gambit",
  title: "Proving Grounds",
  tagline: "Master the bosses. Claim their power.",
  description: copy.hero.description,
  supportingText:
    "You play as The Crusader, a third-person warrior wielding sword and magic in a brutal fantasy world. Choose which boss to face, step into a compact arena, and turn every victory into a new weapon against the battles ahead.",
  stats: [
    "Third-person action RPG",
    "1 hero / 6 bosses",
    "Sword and magic combat",
  ],
} as const;

export const overviewContent = {
  eyebrow: "The Game",
  title: "A soulslike distilled down to its sharpest idea",
  description:
    "Proving Grounds strips away filler and keeps the tension where it matters most: the duel. Instead of exploring a sprawling world, players select a boss, enter a focused arena, and fight through an encounter tuned around timing, spacing, and discipline.",
  supportingText:
    "Every boss grants a new ability on defeat. That reward is not just progression. It reshapes the remaining battles, turning boss order itself into a strategic layer at the heart of the game.",
} as const;

export const coreLoop = [
  {
    step: "01",
    title: "Choose a boss",
    description:
      "Start from a selection screen and decide which encounter to challenge first.",
  },
  {
    step: "02",
    title: "Enter the arena",
    description:
      "Step into a compact, hand-crafted battleground built around that boss.",
  },
  {
    step: "03",
    title: "Survive the duel",
    description:
      "Win through precise swordplay, magic timing, and deliberate movement.",
  },
  {
    step: "04",
    title: "Absorb new power",
    description:
      "Claim an ability or spell that changes how the next encounters can unfold.",
  },
  {
    step: "05",
    title: "Re-route your path",
    description:
      "Use the new advantage wisely, because boss order is part of mastery.",
  },
] as const;

export const bosses = [
  {
    name: "The Ash Tyrant",
    label: "Boss 01",
    description:
      "A furnace-crowned executioner who pressures the arena with delayed fire bursts and crushing reach.",
    reward: "Reward: Ember Rite",
    matchup: "Best used against frostbound or regenerative enemies.",
  },
  {
    name: "Sister Vael",
    label: "Boss 02",
    description:
      "A relentless duelist-saint built around punishing greed, holy counters, and narrow punish windows.",
    reward: "Reward: Litany of Glass",
    matchup: "Strong against shielded or defensive bosses.",
  },
  {
    name: "The Hollow Knight",
    label: "Boss 03",
    description:
      "A broken guardian whose empty armor hides deceptive reach, sudden feints, and brutal recovery traps.",
    reward: "Reward: Hollow Step",
    matchup: "Useful against mobility-heavy encounters.",
  },
  {
    name: "Morvane",
    label: "Boss 04",
    description:
      "A carrion mystic who floods the arena with dark summons, pressure zones, and ranged attrition.",
    reward: "Reward: Grave Bloom",
    matchup: "Favored against swarming or summon-based bosses.",
  },
  {
    name: "The Iron Saint",
    label: "Boss 05",
    description:
      "A plated zealot built around stubborn poise, oppressive pressure, and punishing close-range exchanges.",
    reward: "Reward: Saintbreaker",
    matchup: "Ideal against armored or high-poise opponents.",
  },
  {
    name: "The Warden Below",
    label: "Boss 06",
    description:
      "A subterranean jailer who controls space through collapsing ground, chains, and delayed area denial.",
    reward: "Reward: Depth Chain",
    matchup: "Effective against evasive or airborne targets.",
  },
] as const;

export const featureCards = [
  {
    title: "Precision Combat",
    description:
      "Every dodge, swing, cast, and recovery window is meant to feel deliberate.",
  },
  {
    title: "Hand-Crafted Bosses",
    description:
      "Six focused encounters designed around distinct mechanics, rhythms, and punish patterns.",
  },
  {
    title: "Strategic Progression",
    description:
      "Boss abilities interact with one another, making route planning part of the challenge.",
  },
  {
    title: "Sword and Magic",
    description:
      "The Crusader fights with steel and sorcery, not spectacle for its own sake.",
  },
  {
    title: "Dark Fantasy Tone",
    description:
      "A grim, grounded atmosphere shaped by brutal arenas and hard-earned victories.",
  },
  {
    title: "Reduced Scope, Higher Focus",
    description:
      "One hero. Six bosses. No wasted space between intent and execution.",
  },
] as const;

export const galleryItems = [
  {
    title: "Frame 01",
    description: "Opening gameplay frame from Proving Grounds.",
    image: image01,
  },
  {
    title: "Frame 02",
    description: "Combat angle focused on pressure, stance, and timing.",
    image: image02,
  },
  {
    title: "Frame 03",
    description: "Arena composition highlighting space and environmental tone.",
    image: image03,
  },
  {
    title: "Frame 04",
    description: "A closer look at the crusader in motion.",
    image: image04,
  },
  {
    title: "Frame 05",
    description: "Encounter frame with emphasis on readability and impact.",
    image: image05,
  },
  {
    title: "Frame 06",
    description: "Gameplay capture showing range, pressure, and silhouette.",
    image: image06,
  },
  {
    title: "Frame 07",
    description: "Arena screenshot centered on atmosphere and threat.",
    image: image07,
  },
  {
    title: "Frame 08",
    description: "Mid-combat frame with heavier contrast and spacing.",
    image: image08,
  },
  {
    title: "Frame 09",
    description: "Encounter snapshot built around scale and clarity.",
    image: image09,
  },
  {
    title: "Frame 10",
    description: "Closing gallery frame from the current vertical slice.",
    image: image10,
  },
] as const satisfies ReadonlyArray<{
  title: string;
  description: string;
  image: StaticImageData;
}>;

export const ctaContent = {
  eyebrow: "Follow Development",
  title: "Track the path to the first Steam release",
  description:
    "Wishlist the game, follow the studio, and stay close to development as Proving Grounds moves toward its first Steam release.",
} as const;

export const socialLinks = [
  "Wishlist on Steam",
  "Join Discord",
  "Follow on X",
  "Watch on YouTube",
  "Business Inquiries",
] as const;
