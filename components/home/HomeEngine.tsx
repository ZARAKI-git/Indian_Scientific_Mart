"use client";
/**
 * Home-only fullpage scene engine, ported from the reference. Responsibilities:
 * decide mode (fullpage vs natural scroll), route between scenes, play each
 * scene's entrance, and keep header / rail / counter in sync. Scenes are
 * decoupled: the engine dispatches `scene:enter` / `scene:leave` on a scene's
 * element and scene components listen for themselves (Bus + Router, OCP/DIP).
 */
import { useEffect, useRef, useState } from "react";
import { useMotionEnv } from "@/lib/motion/MotionProvider";
import { gsap, Observer, ScrollTrigger, SplitText } from "@/lib/motion/gsap";
import { headerStore } from "@/lib/ui/headerStore";

type SceneEl = HTMLElement;
const pad = (n: number) => (n < 10 ? "0" : "") + n;

export function HomeEngine() {
  const env = useMotionEnv();
  const [scenes, setScenes] = useState<{ id: string; label: string }[]>([]);
  const [cur, setCur] = useState(0);
  const go = useRef<(i: number) => void>(() => {});
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!env.ready) return;
    const root = document.documentElement;
    const els = Array.from(document.querySelectorAll<SceneEl>("main .scene"));
    setScenes(els.map((s) => ({ id: s.id, label: s.dataset.label ?? s.id })));
    const indexOf = (id: string) => els.findIndex((s) => s.id === id);
    const emit = (type: "scene:enter" | "scene:leave", s: SceneEl) => s.dispatchEvent(new CustomEvent(type));
    const disposers: Array<() => void> = [];
    headerStore.set({ engine: true });

    /* ---------- Reveal: per-scene entrance choreography ---------- */
    const splits = new Map<HTMLElement, Element[]>();
    if (env.rich) {
      document.querySelectorAll<HTMLElement>("main [data-split]").forEach((el) => {
        const sp = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "ln", autoSplit: true,
          onSplit(self) { splits.set(el, self.lines); gsap.set(self.lines, { yPercent: el.dataset.shown ? 0 : 105 }); } });
        disposers.push(() => sp.revert());
      });
    }
    const play = (scene: SceneEl) => {
      if (!env.animate) return;
      const items = scene.querySelectorAll("[data-a]");
      const heads = scene.querySelectorAll<HTMLElement>("[data-split]");
      const tl = gsap.timeline();
      heads.forEach((h) => {
        h.dataset.shown = "1";
        const lines = splits.get(h);
        if (lines) tl.fromTo(lines, { yPercent: 105 }, { yPercent: 0, duration: 1, ease: "power4.out", stagger: .09 }, 0);
        else tl.fromTo(h, { autoAlpha: 0, y: env.rich ? 30 : 0 }, { autoAlpha: 1, y: 0, duration: .9, ease: "power3.out" }, 0);
      });
      tl.fromTo(items, { autoAlpha: 0, y: env.rich ? 34 : 0 }, { autoAlpha: 1, y: 0, duration: .9, ease: "power3.out", stagger: .07, overwrite: true }, .12);
    };
    if (!env.animate) gsap.set("main [data-a]", { autoAlpha: 1 });

    const played = new Set<SceneEl>();
    const fullpage = env.animate && window.innerWidth >= 980 && window.innerHeight >= 640;
    const enter = (s: SceneEl) => { if (!played.has(s) || fullpage) { play(s); played.add(s); } emit("scene:enter", s); };
    const leave = (s: SceneEl) => emit("scene:leave", s);

    const update = (i: number) => {
      const s = els[i]!;
      const dark = s.hasAttribute("data-dark");
      setCur(i);
      headerStore.set({ active: s.id, onDark: dark });
      root.classList.toggle("dark-ui", dark && fullpage);
      if (barRef.current) gsap.to(barRef.current, { scaleX: (i + 1) / els.length, duration: .8, ease: "power3.out" });
    };

    if (fullpage) {
      /* ---------- FullPage: scroll swaps scenes inside a static frame ---------- */
      root.classList.add("fp");
      headerStore.set({ solid: false });
      let at = Math.max(0, indexOf(location.hash.slice(1))), busy = false;
      els.forEach((s, i) => gsap.set(s, { visibility: i === at ? "visible" : "hidden" }));
      const frameOf = (s: SceneEl) => s.querySelector(".frame");
      const goTo = (i: number, dir?: number) => {
        if (busy || i === at || i < 0 || i >= els.length) return;
        busy = true;
        const d = dir ?? (i > at ? 1 : -1);
        const from = els[at]!, to = els[i]!;
        leave(from);
        gsap.set(to, { visibility: "visible", zIndex: 3 });
        gsap.set(from, { zIndex: 2 });
        gsap.timeline({ defaults: { duration: 1.05, ease: "power3.inOut" }, onComplete() {
          from.classList.remove("is-active"); to.classList.add("is-active");
          gsap.set(from, { visibility: "hidden", zIndex: 1 });
          gsap.set(frameOf(from), { clearProps: "transform,opacity,filter" });
          gsap.set(to, { clearProps: "clipPath,zIndex" });
          busy = false;
        } })
          .fromTo(to, { clipPath: d > 0 ? "inset(100% 0% 0% 0% round 0px)" : "inset(0% 0% 100% 0% round 0px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)" }, 0)
          .fromTo(frameOf(to), { yPercent: d > 0 ? 14 : -14 }, { yPercent: 0 }, 0)
          .to(frameOf(from), { yPercent: d > 0 ? -12 : 12, opacity: .25, scale: .96, filter: "blur(3px)" }, 0)
          .call(() => enter(to), undefined, .4);
        at = i;
        update(i);
        history.replaceState(null, "", "#" + to.id);
      };
      /* inner scroll first (e.g. the quote form on short screens), then change scene */
      const step = (dir: number, self?: Observer) => {
        const sc = els[at]!.querySelector<HTMLElement>(".scroller");
        if (sc && self) {
          const dy = Math.abs(self.deltaY) || 60;
          if (dir > 0 && sc.scrollTop + sc.clientHeight < sc.scrollHeight - 2) { sc.scrollTop += dy; return; }
          if (dir < 0 && sc.scrollTop > 0) { sc.scrollTop -= dy; return; }
        }
        goTo(at + dir, dir);
      };
      const obs = Observer.create({ target: window, type: "wheel,touch", wheelSpeed: -1, tolerance: 12, preventDefault: true,
        ignore: "textarea", onUp: (self) => { if (!busy) step(1, self); }, onDown: (self) => { if (!busy) step(-1, self); } });
      const keys = (e: KeyboardEvent) => {
        if ((e.target as HTMLElement).closest?.("input,textarea,select,[contenteditable]")) return;
        const k = e.key;
        if (k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey)) { e.preventDefault(); goTo(at + 1, 1); }
        else if (k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey)) { e.preventDefault(); goTo(at - 1, -1); }
        else if (k === "Home") { e.preventDefault(); goTo(0, -1); }
        else if (k === "End") { e.preventDefault(); goTo(els.length - 1, 1); }
      };
      window.addEventListener("keydown", keys);
      go.current = (i) => goTo(i);
      els[at]!.classList.add("is-active");
      update(at);
      enter(els[at]!);
      let t: number | undefined;
      const resize = () => { clearTimeout(t); t = window.setTimeout(() => { if (window.innerWidth < 980 || window.innerHeight < 640) location.reload(); }, 400); };
      window.addEventListener("resize", resize);
      disposers.push(() => {
        obs.kill(); window.removeEventListener("keydown", keys); window.removeEventListener("resize", resize);
        root.classList.remove("fp", "dark-ui");
        els.forEach((s) => { s.classList.remove("is-active"); gsap.set(s, { clearProps: "all" }); gsap.set(frameOf(s), { clearProps: "all" }); });
      });
    } else {
      /* ---------- Natural scroll (phones, short screens, reduced motion) ---------- */
      const solid = () => headerStore.set({ solid: window.scrollY > 30 });
      solid();
      window.addEventListener("scroll", solid, { passive: true });
      go.current = (i) => els[i]!.scrollIntoView({ behavior: env.reduce ? "auto" : "smooth" });
      update(0);
      const triggers = els.flatMap((s, i) => [
        ScrollTrigger.create({ trigger: s, start: "top 72%", once: true, onEnter: () => enter(s) }),
        ScrollTrigger.create({ trigger: s, start: "top 50%", end: "bottom 50%", onToggle: (self) => { if (self.isActive) update(i); else leave(s); } }),
      ]);
      if (location.hash) { const i = indexOf(location.hash.slice(1)); if (i > 0) requestAnimationFrame(() => els[i]!.scrollIntoView()); }
      disposers.push(() => { window.removeEventListener("scroll", solid); triggers.forEach((t) => t.kill()); });
    }

    /* in-page links (#id and /#id) route through the scene engine */
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      const m = /^\/?#(.+)$/.exec(href);
      if (!m) return;
      const i = indexOf(m[1]!);
      if (i < 0) return;
      e.preventDefault();
      go.current(i);
    };
    document.addEventListener("click", click);
    const goEvt = (e: Event) => { const i = indexOf((e as CustomEvent<string>).detail); if (i >= 0) go.current(i); };
    document.addEventListener("scene:go", goEvt);

    return () => {
      document.removeEventListener("click", click);
      document.removeEventListener("scene:go", goEvt);
      disposers.forEach((d) => d());
      headerStore.set({ engine: false, active: null, onDark: false });
    };
  }, [env]);

  return (
    <>
      <nav className="rail-nav" aria-label="Sections">
        {scenes.map((s, i) => (
          <button key={s.id} type="button" aria-label={s.label} className={i === cur ? "on" : undefined}
            aria-current={i === cur ? "true" : "false"} onClick={() => go.current(i)}>
            <i /><span>{s.label}</span>
          </button>
        ))}
      </nav>
      <div className="counter" aria-hidden="true">
        <b>{pad(cur + 1)}</b><span className="bar"><i ref={barRef} /></span><span>{pad(scenes.length || 7)}</span>
        <span className="hint"><span className="mouse" />Scroll</span>
      </div>
    </>
  );
}

/** Ask the engine to route to a scene by id (used by scene components; no import of the engine). */
export const goToScene = (id: string) => document.dispatchEvent(new CustomEvent("scene:go", { detail: id }));
