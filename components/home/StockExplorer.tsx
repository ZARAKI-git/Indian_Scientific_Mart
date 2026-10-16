"use client";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { useMotionEnv } from "@/lib/motion/MotionProvider";
import { gsap } from "@/lib/motion/gsap";
import { autoAdvance } from "@/lib/motion/primitives";
import { unsplash, unsplashSet } from "@/lib/images";
import { GuardedImg } from "@/components/ui/GuardedImg";
import { useSceneEvents } from "./useSceneEvents";

const ITEMS = [
  { id: "1617155093730-a8bf47be792d", name: "Beaker, 250 ml", note: "Borosilicate · graduated", cat: "Glassware", q: "beaker 250" },
  { id: "1628864005140-7770b9b8e7dd", name: "Conical flask", note: "Narrow neck · for swirling", cat: "Glassware", q: "conical flask" },
  { id: "1643625748977-43532f7d023f", name: "Measuring cylinder", note: "Graduated · to the mark", cat: "Volumetric", q: "measuring cylinder" },
  { id: "1628863353691-0071c8c1874c", name: "Watch glass", note: "Evaporation · covering", cat: "Glassware", q: "watch glass" },
  { id: "1595500383097-2ac105c5f705", name: "Reagent bottle", note: "Amber · light-sensitive reagents", cat: "Consumables", q: "reagent bottle amber" },
  { id: "1601961545517-59307b1fbac3", name: "Wash bottle", note: "Polypropylene · squeeze-dispense", cat: "Plastic labware", q: "wash bottle" },
  { id: "1643625818238-2169a1a029dd", name: "Funnel set", note: "Filtration · transfer", cat: "Glassware", q: "funnel" },
];

/** The reference's Explorer: hover/tap to select, auto-advances every 5s with a progress bar. */
export function StockExplorer() {
  const env = useMotionEnv();
  const [cur, setCur] = useState(0);
  const [layers, setLayers] = useState<[number, number | null]>([0, null]); // front, back image index
  const root = useRef<HTMLDivElement>(null);
  const frontIsA = useRef(true);
  const stopTimer = useRef<() => void>(() => {});
  const curRef = useRef(0);
  const running = useRef(false);

  const select = useCallback((i: number) => {
    if (i === curRef.current) return;
    curRef.current = i;
    setCur(i);
    const fig = root.current;
    if (!fig) return;
    const [a, b] = [fig.querySelector<HTMLImageElement>("#stageA")!, fig.querySelector<HTMLImageElement>("#stageB")!];
    const back = frontIsA.current ? b : a, front = frontIsA.current ? a : b;
    setLayers((l) => (frontIsA.current ? [l[0], i] : [i, l[1]]));
    requestAnimationFrame(() => {
      if (env.animate) {
        gsap.fromTo(back, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: .9, ease: "power3.out" });
        gsap.to(front, { opacity: 0, duration: .9, ease: "power2.out" });
        gsap.fromTo(fig.querySelectorAll("#stageName,#stageNote"), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .5, stagger: .05 });
      } else { back.style.opacity = "1"; front.style.opacity = "0"; }
      frontIsA.current = !frontIsA.current;
    });
  }, [env.animate]);

  const run = useCallback(() => {
    stopTimer.current();
    running.current = true;
    const bar = root.current?.querySelector<HTMLElement>("#stageProg");
    if (!bar) return;
    stopTimer.current = autoAdvance(bar, env, 5, () => { select((curRef.current + 1) % ITEMS.length); run(); });
  }, [env, select]);

  const events = useMemo(() => ({ enter: run, leave: () => { stopTimer.current(); running.current = false; } }), [run]);
  useSceneEvents(root, events);

  const pick = (i: number) => { select(i); run(); };
  const it = ITEMS[cur]!;
  const img = (i: number | null) => (i === null ? undefined : ITEMS[i]!);

  return (
    <div className="explorer" ref={root}>
      <div>
        <span className="tag" data-a>Along the bench</span>
        <h2 data-split style={{ marginBottom: "clamp(18px,2.4vw,30px)" }}>Stock, as it actually looks.</h2>
        <ul className="plist" id="plist" data-a>
          {ITEMS.map((p, i) => (
            <li key={p.name}>
              <button type="button" className={i === cur ? "on" : undefined} aria-pressed={i === cur}
                onClick={() => pick(i)} onMouseEnter={env.coarse ? undefined : () => pick(i)}>
                <span className="i">{String(i + 1).padStart(2, "0")}</span><b>{p.name}</b><small>{p.cat}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <figure className="stage" id="stage" data-a>
        <span className="prog"><i id="stageProg" /></span>
        {[layers[0], layers[1]].map((li, k) => {
          const p = img(li);
          return <GuardedImg key={k} id={k === 0 ? "stageA" : "stageB"} hideSelector=".never"
            src={p ? unsplash(p.id, 1200, 72) : undefined} srcSet={p ? unsplashSet(p.id, [600, 900, 1200], 72) : undefined}
            sizes="(max-width:980px) 92vw, 52vw" alt={p?.name ?? ""} loading="lazy" style={k === 1 && li === null ? { opacity: 0 } : undefined} />;
        })}
        <figcaption className="cap">
          <span><b id="stageName">{it.name}</b><small id="stageNote">{it.note} · <Link href={`/catalogue?q=${encodeURIComponent(it.q)}`} style={{ color: "var(--brand-dk)", fontWeight: 600 }}>See prices</Link></small></span>
          <span className="chiplet" id="stageCat">{it.cat}</span>
        </figcaption>
      </figure>
    </div>
  );
}
