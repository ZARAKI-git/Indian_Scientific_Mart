"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { detectEnv, SSR_ENV, type MotionEnv } from "./env";
import { registerGsap } from "./gsap";

const Ctx = createContext<MotionEnv>(SSR_ENV);

declare global {
  interface Window { __ismMotion?: boolean }
}

/**
 * Sets up capability tiers once and exposes them to every animation.
 * Also signals the inline boot script that motion is live; if this never
 * runs (bundle blocked, script error) the boot script removes `.js` so the
 * page stays a plain, fully visible scrolling site, as in the reference.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [env, setEnv] = useState<MotionEnv>(SSR_ENV);
  useEffect(() => {
    try {
      registerGsap();
      window.__ismMotion = true;
    } catch {
      document.documentElement.classList.remove("js");
    }
    setEnv(detectEnv());
    // keyboard focus reveals anything still waiting for its scroll entrance
    const onFocus = (e: FocusEvent) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>("[data-a]");
      if (el && getComputedStyle(el).opacity !== "1") {
        el.style.opacity = "1"; el.style.visibility = "visible"; el.style.transform = "none";
      }
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);
  return <Ctx.Provider value={env}>{children}</Ctx.Provider>;
}

export const useMotionEnv = () => useContext(Ctx);
