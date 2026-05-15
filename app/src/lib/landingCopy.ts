import enCopy from "../../content/landing.copy.json";
import deCopy from "../../content/landing.copy.de.json";

export type LandingCopy = typeof enCopy;

export function getLandingCopy(): LandingCopy {
  return enCopy;
}

export { enCopy, deCopy };
