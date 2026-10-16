"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useMotionEnv } from "@/lib/motion/MotionProvider";
import { tiltCard } from "@/lib/motion/primitives";

/** Applies the reference's card tilt to every `selector` match inside. */
export function TiltGroup({ selector, children, className }: { selector: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const env = useMotionEnv();
  useEffect(() => {
    if (!env.ready || !ref.current) return;
    const cleanups = Array.from(ref.current.querySelectorAll<HTMLElement>(selector)).map((c) => tiltCard(c, env));
    return () => cleanups.forEach((c) => c());
  }, [env, selector, children]);
  return <div ref={ref} className={className}>{children}</div>;
}
