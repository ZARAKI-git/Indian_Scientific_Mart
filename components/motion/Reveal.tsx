"use client";
import { useRef, type ElementType, type ReactNode, type ComponentPropsWithoutRef } from "react";
import { useMotionEnv } from "@/lib/motion/MotionProvider";
import { useGSAP } from "@/lib/motion/gsap";
import { revealOnEnter } from "@/lib/motion/primitives";

type Props<T extends ElementType> = { as?: T; children: ReactNode } & Omit<ComponentPropsWithoutRef<T>, "as" | "children">;

/** Natural-scroll reveal scope: animates [data-a] / [data-split] descendants as they enter. */
export function Reveal<T extends ElementType = "div">({ as, children, ...rest }: Props<T>) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);
  const env = useMotionEnv();
  useGSAP(() => {
    if (!env.ready || !ref.current) return;
    return revealOnEnter(ref.current, env);
  }, { scope: ref, dependencies: [env.ready] });
  return <Tag ref={ref} {...rest}>{children}</Tag>;
}
