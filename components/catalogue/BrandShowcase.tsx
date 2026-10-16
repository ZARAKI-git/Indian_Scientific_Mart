"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { BrandShowcaseItem } from "@/lib/domain/types";
import { useMotionEnv } from "@/lib/motion/MotionProvider";
import { gsap } from "@/lib/motion/gsap";

const STEP_SECONDS = 2.2;
const PERSPECTIVE = 1200, DEPTH = 120, ROTATE = 38, GAP = 8;
const SCALE = [1, .62, .44, .34];      // by distance from front; last entry is the hidden "parked" slot
const OPACITY = [1, .7, .34, 0];

interface Orbit { range: number; itemWidth: number; tx: number[] }

/**
 * Coverflow geometry for the space available. Logos sit on no card, so neighbours must
 * never overlap the front one: each slot's translateX is solved from the projected
 * half-widths (scale x perspective x cos(rotateY)) of the logos either side of it.
 * Two per side when they fit at a readable size (rich tier only), otherwise one.
 */
function orbitFor(width: number, rich: boolean): Orbit {
  const persp = (a: number) => PERSPECTIVE / (PERSPECTIVE + a * DEPTH);
  const half = (a: number) => .5 * SCALE[a]! * persp(a) * (a ? Math.cos(ROTATE * Math.PI / 180) : 1); // x itemWidth
  const centres = (count: number) => {                    // projected centre of each slot, x itemWidth (+ gaps)
    const c = [{ k: 0, g: 0 }];
    for (let a = 1; a <= count; a++) c.push({ k: c[a - 1]!.k + half(a - 1) + half(a), g: c[a - 1]!.g + GAP });
    return c;
  };
  const fit = (range: number) => {                        // widest item whose outermost visible logo stays in bounds
    const c = centres(range)[range]!;
    return (width / 2 - c.g) / (c.k + half(range));
  };
  const range = rich && fit(2) >= 150 ? 2 : 1;
  const itemWidth = Math.round(Math.min(260, fit(range)));
  const tx = centres(range + 1).map((c, a) => (c.k * itemWidth + c.g) / persp(a));
  return { range, itemWidth, tx };
}

/** Signed distance from the active index, wrapped so the ring has no end. */
function offsetOf(i: number, active: number, n: number) {
  let o = (((i - active) % n) + n) % n;
  if (o > n / 2) o -= n;
  return o;
}

/** Height as a fraction of item width, sized to a shared visual area so wordmarks and square marks read alike. */
function fitLogo(img: HTMLImageElement) {
  if (!img.naturalWidth) return;
  const ratio = img.naturalWidth / img.naturalHeight || 1;
  img.style.setProperty("--lk", Math.min(.46, Math.max(.17, Math.sqrt(.3 / ratio))).toFixed(3));
}

function Logo({ brand, onFail, lazy }: { brand: BrandShowcaseItem; onFail: () => void; lazy?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={brand.logoUrl!} alt={brand.name} decoding="async" loading={lazy ? "lazy" : "eager"} draggable={false}
    // already-complete images (cached, or loaded before hydration) never fire onLoad
    ref={(n) => { if (n?.complete) fitLogo(n); }} onLoad={(e) => fitLogo(e.currentTarget)} onError={onFail} />;
}

/**
 * Catalogue hero's brand coverflow: real logos only, one facing front, neighbours
 * angled back on both sides, rotating every 2.2s. Presentation only; brands arrive as props.
 * Holds on hover and hidden tabs. Reduced motion gets a static row (CSS, via .reduce).
 */
export function BrandShowcase({ brands }: { brands: BrandShowcaseItem[] }) {
  const env = useMotionEnv();
  const [failed, setFailed] = useState<Set<number>>(() => new Set());
  const items = useMemo(() => brands.filter((b) => b.logoUrl && !failed.has(b.id)), [brands, failed]);
  const n = items.length;
  const [active, setActive] = useState(0);
  const [width, setWidth] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!env.ready || !env.animate || n < 2 || !root.current) return;
    const el = root.current;
    const holds = new Set<"hover" | "hidden">();
    const call = gsap.delayedCall(STEP_SECONDS, () => {
      setActive((a) => (a + 1) % n);
      call.restart(true);
    });
    const sync = () => (holds.size ? call.pause() : call.resume());
    const hold = (r: "hover" | "hidden", on: boolean) => { if (on) holds.add(r); else holds.delete(r); sync(); };
    const enter = () => hold("hover", true), leave = () => hold("hover", false);
    const vis = () => hold("hidden", document.visibilityState === "hidden");
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", vis);
    vis();
    return () => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", vis);
      call.kill();
    };
  }, [env, n]);

  if (!n) return null;
  const fail = (id: number) => () => setFailed((s) => new Set(s).add(id));
  const cur = active % n;
  const orbit = orbitFor(width ?? 560, env.rich);
  const park = orbit.range + 1;   // hidden logos wait just outside the visible arc
  const style = { "--iw": `${orbit.itemWidth}px` } as CSSProperties;

  return (
    <div className="orbit" ref={root} style={style} data-a data-live={width !== null || undefined} data-rich={env.rich || undefined}
      role="region" aria-roledescription="carousel" aria-label="Brands we supply">
      <div className="orbit-track">
        {items.map((b, i) => {
          const o = offsetOf(i, cur, n);
          const before = offsetOf(i, (cur - 1 + n) % n, n);
          const p = Math.max(-park, Math.min(park, o));
          const a = Math.abs(p);
          // a hidden logo wrapping from one side to the other jumps instead of sweeping behind the front
          const jump = Math.abs(o) > orbit.range && Math.abs(before) > orbit.range && Math.sign(o) !== Math.sign(before);
          return (
            <div key={b.id} className="orbit-item" data-front={o === 0 || undefined} aria-hidden={o !== 0 || undefined}
              style={{
                transform: `translate(-50%,-50%) translateX(${Math.sign(p) * orbit.tx[a]!}px) translateZ(${-a * DEPTH}px) rotateY(${-Math.sign(p) * ROTATE}deg) scale(${SCALE[a]})`,
                opacity: Math.abs(o) <= orbit.range ? OPACITY[a] : 0,
                zIndex: 50 - a,
                transition: jump ? "none" : undefined,
              }}>
              <Logo brand={b} onFail={fail(b.id)} />
            </div>
          );
        })}
      </div>
      <ul className="orbit-static" aria-label="Brands we supply">
        {items.map((b) => <li key={b.id}><Logo brand={b} lazy onFail={fail(b.id)} /></li>)}
      </ul>
    </div>
  );
}
