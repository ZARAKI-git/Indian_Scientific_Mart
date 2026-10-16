"use client";
import { useEffect, useRef } from "react";
import { useMotionEnv } from "@/lib/motion/MotionProvider";
import { tiltCard } from "@/lib/motion/primitives";
import { unsplash, unsplashSet } from "@/lib/images";
import { goToScene } from "./HomeEngine";
import { preselectNeed } from "@/components/quote/needs";

const CATS = [
  { n: "01", t: "Glassware", p: "Beakers, test tubes, funnels and watch glasses: the daily working set.", img: "1639775425635-fd86a889f2a7" },
  { n: "02", t: "Volumetric & measuring", p: "Flasks, pipettes, burettes and cylinders, accurate to the mark.", img: "1595154038117-db4cda69f11d" },
  { n: "03", t: "Heating & support", p: "Tripods, Bunsen burners, wire gauze and clamps.", img: "1643625813046-88415927850c" },
  { n: "04", t: "Centrifuges & instruments", p: "Digital laboratory centrifuges and the bench instruments beside them.", img: "1608037222022-62649819f8aa" },
  { n: "05", t: "Plastic labware", p: "Wash bottles, racks, funnels and trays in polypropylene.", img: "1595154038460-25385f893062" },
  { n: "06", t: "Consumables", p: "Filter paper, tubing, corks and stoppers: the items that always run out.", img: "1595500381966-eee2034aae48" },
];

/** Category cards: tilt on hover; click preselects the category in the quote form and routes there. */
export function SupplyCats() {
  const ref = useRef<HTMLDivElement>(null);
  const env = useMotionEnv();
  useEffect(() => {
    if (!env.ready || !ref.current) return;
    const off = Array.from(ref.current.querySelectorAll<HTMLElement>(".cat")).map((c) => tiltCard(c, env));
    return () => off.forEach((f) => f());
  }, [env]);
  return (
    <div className="cats" ref={ref}>
      {CATS.map((c) => (
        <button key={c.n} type="button" className="cat" data-a onClick={() => { preselectNeed(c.t); goToScene("quote"); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unsplash(c.img, 900)} srcSet={unsplashSet(c.img, [480, 700, 900])} sizes="(max-width:640px) 92vw, (max-width:980px) 46vw, 30vw" alt="" loading="lazy" decoding="async" />
          <span className="n">{c.n}</span><h3>{c.t}</h3><p>{c.p}</p><span className="go">Quote this category →</span>
        </button>
      ))}
    </div>
  );
}
