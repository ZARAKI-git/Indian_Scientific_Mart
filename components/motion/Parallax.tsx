"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useMotionEnv } from "@/lib/motion/MotionProvider";
import { parallaxLayer } from "@/lib/motion/primitives";

export function Parallax({ amount = 12, className, children }: { amount?: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const env = useMotionEnv();
  useEffect(() => (env.ready && ref.current ? parallaxLayer(ref.current, env, amount) : undefined), [env, amount]);
  return <div ref={ref} className={className} aria-hidden="true">{children}</div>;
}
