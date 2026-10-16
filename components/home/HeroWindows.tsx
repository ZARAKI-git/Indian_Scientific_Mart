"use client";
import { useMemo, useRef } from "react";
import { useMotionEnv } from "@/lib/motion/MotionProvider";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { pointerParallax } from "@/lib/motion/primitives";
import { unsplash, unsplashSet } from "@/lib/images";
import { GuardedImg } from "@/components/ui/GuardedImg";
import { useSceneEvents } from "./useSceneEvents";

type Win = { id: string; alt: string; cap: string; kind: "sci" | "stock"; size?: "tall" | "short" };
const COLS: { speed: number; dir: "up" | "down"; wins: Win[] }[] = [
  { speed: 26, dir: "up", wins: [
    { id: "1532187863486-abf9dbad1b69", alt: "Scientist working at a laboratory bench", cap: "Research benches", kind: "sci", size: "tall" },
    { id: "1639775425635-fd86a889f2a7", alt: "Row of laboratory glass vessels", cap: "Borosilicate glassware", kind: "stock" },
    { id: "1595500381966-eee2034aae48", alt: "Amber reagent bottle", cap: "Reagent bottles", kind: "stock", size: "short" },
    { id: "1582719471384-894fbb16e074", alt: "Scientist examining test tubes", cap: "Sample preparation", kind: "sci" }] },
  { speed: 32, dir: "down", wins: [
    { id: "1608037222022-62649819f8aa", alt: "Bench instrument on a laboratory surface", cap: "Digital centrifuges", kind: "stock" },
    { id: "1576086213369-97a306d36557", alt: "Researcher using a pipette", cap: "Pipetting & titration", kind: "sci", size: "tall" },
    { id: "1628864005140-7770b9b8e7dd", alt: "Glass conical flask", cap: "Conical flasks", kind: "stock", size: "short" },
    { id: "1617155093730-a8bf47be792d", alt: "Gloved hand holding a beaker", cap: "250 ml beakers", kind: "sci" }] },
  { speed: 24, dir: "up", wins: [
    { id: "1595154038117-db4cda69f11d", alt: "Graduated measuring vessel", cap: "Measuring cylinders", kind: "stock", size: "short" },
    { id: "1579154204601-01588f351e67", alt: "Scientist looking through a microscope", cap: "College practicals", kind: "sci", size: "tall" },
    { id: "1595154038460-25385f893062", alt: "Polypropylene labware", cap: "Plastic labware", kind: "stock" },
    { id: "1643625813046-88415927850c", alt: "Gloved hand dispensing liquid into a test tube", cap: "Test tube work", kind: "sci", size: "short" }] },
  { speed: 30, dir: "down", wins: [
    { id: "1581093588401-fbb62a02f120", alt: "Scientist in a laboratory", cap: "Pathology benches", kind: "sci" },
    { id: "1628863353691-0071c8c1874c", alt: "Watch glass from above", cap: "Watch glasses", kind: "stock", size: "short" },
    { id: "1643625748977-43532f7d023f", alt: "Glass vessel with clear liquid", cap: "Volumetric ware", kind: "stock", size: "tall" },
    { id: "1601961545517-59307b1fbac3", alt: "Glass vessel on a blue laboratory surface", cap: "Wash bottles", kind: "stock" }] },
];

function Window({ w, clone, eager }: { w: Win; clone?: boolean; eager?: boolean }) {
  return (
    <figure className={`win${w.size ? " " + w.size : ""}`} aria-hidden={clone || undefined}>
      <GuardedImg src={unsplash(w.id, 520, 65)} srcSet={unsplashSet(w.id, [260, 360, 520], 65)} sizes="(max-width:640px) 45vw, (max-width:980px) 30vw, 13vw"
        alt={clone ? "" : w.alt} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} />
      <figcaption><span className={w.kind === "sci" ? "sci" : undefined}>{w.kind === "sci" ? "In the lab" : "Stock"}</span><br />{w.cap}</figcaption>
    </figure>
  );
}

/** The reference's HeroWindows: four infinite vertical columns, slowed on hover, pointer parallax. */
export function HeroWindows() {
  const box = useRef<HTMLDivElement>(null);
  const env = useMotionEnv();
  const loops = useRef<gsap.core.Tween[]>([]);
  const events = useMemo(() => ({
    enter: () => loops.current.forEach((t) => t.play()),
    leave: () => { if (document.documentElement.classList.contains("fp")) loops.current.forEach((t) => t.pause()); },
  }), []);
  useSceneEvents(box, events);

  useGSAP(() => {
    if (!env.ready || !box.current) return;
    const cols = Array.from(box.current.querySelectorAll<HTMLElement>(".col"));
    if (env.animate) {
      loops.current = cols.map((col) => {
        const up = col.dataset.dir === "up";
        const tw = gsap.fromTo(col.querySelector(".track"), { yPercent: up ? 0 : -50 },
          { yPercent: up ? -50 : 0, duration: Number(col.dataset.speed) || 28, ease: "none", repeat: -1 });
        col.addEventListener("mouseenter", () => gsap.to(tw, { timeScale: .12, duration: .6 }));
        col.addEventListener("mouseleave", () => gsap.to(tw, { timeScale: 1, duration: .8 }));
        return tw;
      });
    }
    const hero = box.current.closest<HTMLElement>(".hero");
    const off = hero ? pointerParallax(hero, cols, env, hero.querySelector<HTMLElement>(".spot")) : undefined;
    return () => { off?.(); loops.current = []; };
  }, { scope: box, dependencies: [env.ready] });

  return (
    <div className="windows" id="windows" ref={box} aria-label="Scientists at work and products from our stock">
      {COLS.map((c, ci) => (
        <div className="col" data-speed={c.speed} data-dir={c.dir} key={ci}>
          <div className="track">
            {c.wins.map((w, i) => <Window key={w.id} w={w} eager={ci < 2 && i < 2} />)}
            {c.wins.map((w) => <Window key={w.id + "-c"} w={w} clone />)}
          </div>
        </div>
      ))}
    </div>
  );
}
