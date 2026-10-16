"use client";
/**
 * Motion primitives. Each does one job, takes the capability tier, and returns
 * a cleanup. Same easing and durations as the reference (power3/power4.out,
 * ~.9–1s, .07–.09 stagger), so every page reads as one system.
 */
import type { MotionEnv } from "./env";
import { gsap, ScrollTrigger, SplitText } from "./gsap";

type Cleanup = () => void;
const noop: Cleanup = () => {};

/** Line-masked heading reveal (SplitText, as the reference's [data-split]). */
export function splitHeading(el: HTMLElement, env: MotionEnv, opts: { delay?: number; trigger?: Element | null } = {}): Cleanup {
  if (!env.animate) return noop;
  if (!env.rich) {
    const t = gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: .8, ease: "power2.out", delay: opts.delay ?? 0,
      scrollTrigger: opts.trigger === null ? undefined : { trigger: opts.trigger ?? el, start: "top 85%", once: true } });
    return () => { t.scrollTrigger?.kill(); t.kill(); };
  }
  let tween: gsap.core.Tween | null = null;
  const split = SplitText.create(el, {
    type: "lines", mask: "lines", linesClass: "ln", autoSplit: true,
    onSplit(self) {
      tween?.scrollTrigger?.kill(); tween?.kill();
      tween = gsap.fromTo(self.lines, { yPercent: 105 }, {
        yPercent: 0, duration: 1, ease: "power4.out", stagger: .09, delay: opts.delay ?? 0,
        scrollTrigger: opts.trigger === null ? undefined : { trigger: opts.trigger ?? el, start: "top 85%", once: true },
      });
      return tween;
    },
  });
  return () => { tween?.scrollTrigger?.kill(); tween?.kill(); split.revert(); };
}

/** Staggered entrance for [data-a] children of a scope, batched as they scroll in. */
export function revealOnEnter(scope: Element, env: MotionEnv): Cleanup {
  const items = Array.from(scope.querySelectorAll<HTMLElement>("[data-a]"));
  const heads = Array.from(scope.querySelectorAll<HTMLElement>("[data-split]"));
  if (!env.animate) {
    gsap.set(items, { autoAlpha: 1, clearProps: "transform" });
    return noop;
  }
  const cleanups = heads.map((h) => splitHeading(h, env));
  const y = env.rich ? 34 : 0;   // touch / low-end: fades only, no transforms
  const triggers = ScrollTrigger.batch(items, {
    start: "top 88%", once: true,
    onEnter: (batch) => gsap.fromTo(batch, { autoAlpha: 0, y }, { autoAlpha: 1, y: 0, duration: .9, ease: "power3.out", stagger: .07, overwrite: true }),
  });
  // anything already above the fold at load plays immediately
  ScrollTrigger.refresh();
  return () => { cleanups.forEach((c) => c()); triggers.forEach((t) => t.kill()); };
}

/** 3D hover tilt (the reference's category cards). Pointer-fine, capable devices only. */
export function tiltCard(card: HTMLElement, env: MotionEnv, max = 10): Cleanup {
  if (!env.rich) return noop;
  const rx = gsap.quickTo(card, "rotationX", { duration: .5, ease: "power3" });
  const ry = gsap.quickTo(card, "rotationY", { duration: .5, ease: "power3" });
  const move = (e: PointerEvent) => {
    const r = card.getBoundingClientRect();
    ry(((e.clientX - r.left) / r.width - .5) * max);
    rx(-((e.clientY - r.top) / r.height - .5) * max);
  };
  const leave = () => { rx(0); ry(0); };
  card.addEventListener("pointermove", move);
  card.addEventListener("pointerleave", leave);
  return () => { card.removeEventListener("pointermove", move); card.removeEventListener("pointerleave", leave); gsap.set(card, { clearProps: "transform" }); };
}

/** Scroll-linked drift for a decorative layer. */
export function parallaxLayer(el: HTMLElement, env: MotionEnv, amount = 12): Cleanup {
  if (!env.rich) return noop;
  const t = gsap.fromTo(el, { yPercent: -amount / 2 }, { yPercent: amount / 2, ease: "none",
    scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom top", scrub: true } });
  return () => { t.scrollTrigger?.kill(); t.kill(); };
}

/** Pointer-follow parallax (the hero windows + spotlight). */
export function pointerParallax(area: HTMLElement, layers: HTMLElement[], env: MotionEnv, spot?: HTMLElement | null): Cleanup {
  if (!env.rich) return noop;
  const qx = layers.map((c) => gsap.quickTo(c, "x", { duration: 1.1, ease: "power3" }));
  const qy = layers.map((c) => gsap.quickTo(c, "y", { duration: 1.1, ease: "power3" }));
  const sx = spot ? gsap.quickTo(spot, "left", { duration: .7, ease: "power3" }) : null;
  const sy = spot ? gsap.quickTo(spot, "top", { duration: .7, ease: "power3" }) : null;
  const move = (e: PointerEvent) => {
    const r = area.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
    qx.forEach((q, i) => q(nx * (10 + i * 6)));
    qy.forEach((q, i) => q(ny * (8 + i * 4) * (i % 2 ? -1 : 1)));
    sx?.(e.clientX - r.left); sy?.(e.clientY - r.top);
  };
  area.addEventListener("pointermove", move);
  return () => area.removeEventListener("pointermove", move);
}

/** A line that fills as its trigger scrolls through (or plays once, like the ordering steps). */
export function progressLine(line: HTMLElement, env: MotionEnv, opts: { trigger?: Element; scrub?: boolean; onStep?: (p: number) => void } = {}): Cleanup {
  if (!env.animate) { gsap.set(line, { scaleX: 1 }); opts.onStep?.(1); return noop; }
  const t = gsap.fromTo(line, { scaleX: 0 }, {
    scaleX: 1, ease: opts.scrub ? "none" : "power1.inOut", duration: opts.scrub ? undefined : 2.2,
    onUpdate() { opts.onStep?.(this.progress()); },
    scrollTrigger: { trigger: opts.trigger ?? line, start: "top 80%", end: opts.scrub ? "bottom 40%" : undefined,
      scrub: opts.scrub ? .6 : false, once: !opts.scrub },
  });
  return () => { t.scrollTrigger?.kill(); t.kill(); };
}

/** Timed auto-advance with a progress bar (the reference's stock explorer). */
export function autoAdvance(bar: HTMLElement, env: MotionEnv, seconds: number, onDone: () => void): Cleanup {
  if (!env.animate) return noop;
  const t = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: seconds, ease: "none", onComplete: onDone });
  return () => t.kill();
}

/** Short stagger for rows that mount after a fetch (catalogue pages). */
export function staggerIn(els: Element[], env: MotionEnv): Cleanup {
  if (!env.animate || !els.length) return noop;
  const t = gsap.fromTo(els, { autoAlpha: 0, y: env.rich ? 14 : 0 }, { autoAlpha: 1, y: 0, duration: .5, ease: "power3.out", stagger: .03, clearProps: "transform" });
  return () => t.kill();
}
