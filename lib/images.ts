/** Unsplash sources with width-appropriate srcsets. auto=format serves AVIF/WebP where supported. */
export const unsplash = (id: string, w: number, q = 68) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`;
export const unsplashSet = (id: string, widths: number[], q = 68) => widths.map((w) => `${unsplash(id, w, q)} ${w}w`).join(", ");

/** Known-good fallbacks (the reference's ImageGuard list). */
export const GOOD_IMAGES = ["1639775425635-fd86a889f2a7", "1617155093730-a8bf47be792d", "1643625813046-88415927850c",
  "1608037222022-62649819f8aa", "1628864005140-7770b9b8e7dd", "1643625818238-2169a1a029dd", "1595154038117-db4cda69f11d",
  "1643625748977-43532f7d023f"];

/** Banner imagery per catalogue category (same photo set as the reference). */
export const CATEGORY_IMAGE: Record<string, string> = {
  chemicals: "1595500381966-eee2034aae48", "life-science": "1576086213369-97a306d36557", microbiology: "1582719471384-894fbb16e074",
  glassware: "1639775425635-fd86a889f2a7", plasticware: "1595154038460-25385f893062", filtration: "1643625818238-2169a1a029dd",
  "analytical-instruments": "1608037222022-62649819f8aa", balances: "1608037222022-62649819f8aa", "lab-equipment": "1608037222022-62649819f8aa",
  thermometers: "1643625748977-43532f7d023f", education: "1579154204601-01588f351e67", "water-testing": "1601961545517-59307b1fbac3",
  general: "1532187863486-abf9dbad1b69",
};
