"use client";
import { useEffect, type RefObject } from "react";

/** Lets a scene component react to the engine's enter/leave without knowing the engine. */
export function useSceneEvents(ref: RefObject<HTMLElement | null>, on: { enter?: () => void; leave?: () => void }) {
  useEffect(() => {
    const scene = ref.current?.closest(".scene");
    if (!scene) return;
    const en = () => on.enter?.();
    const lv = () => on.leave?.();
    scene.addEventListener("scene:enter", en);
    scene.addEventListener("scene:leave", lv);
    return () => { scene.removeEventListener("scene:enter", en); scene.removeEventListener("scene:leave", lv); };
  }, [ref, on]);
}
