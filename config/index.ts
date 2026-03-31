import type { Metadata } from "next";

export const siteConfig: Metadata = {
  title: "Skill Gambit | Proving Grounds",
  description:
    "Proving Grounds is a reduced-scope soulslike from Skill Gambit focused on precision combat, boss mastery, and strategic boss order.",
  keywords: [
    "skill gambit",
    "proving grounds",
    "soulslike",
    "action RPG",
    "indie game",
    "boss rush",
    "dark fantasy",
    "unity game",
    "steam",
  ] as Array<string>,
  authors: {
    name: "Skill Gambit",
  },
} as const;

export const links = {
  sourceCode: "https://github.com/sanidhyy/duolingo-clone",
  email: "sanidhya.verma12345@gmail.com",
} as const;
