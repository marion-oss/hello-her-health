import landingCopy from "../../content/landing.copy.json";

export type LandingCopy = typeof landingCopy;

export function getLandingCopy(): LandingCopy {
  return landingCopy;
}

