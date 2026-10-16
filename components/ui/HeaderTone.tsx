"use client";
import { useEffect } from "react";
import { headerStore } from "@/lib/ui/headerStore";

/** Marks the page as having a dark hero: header uses its `on-dark` variant until it turns solid. */
export function HeaderTone({ dark }: { dark: boolean }) {
  useEffect(() => {
    headerStore.set({ onDark: dark });
    return () => headerStore.set({ onDark: false });
  }, [dark]);
  return null;
}
