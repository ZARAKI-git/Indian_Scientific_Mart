"use client";
/** Header presentation state. The home scene engine drives it per scene; other pages per scroll. */
import { useSyncExternalStore } from "react";

export interface HeaderState { solid: boolean; onDark: boolean; active: string | null; engine: boolean }
let state: HeaderState = { solid: false, onDark: false, active: null, engine: false };
const subs = new Set<() => void>();

export const headerStore = {
  get: () => state,
  set(patch: Partial<HeaderState>) {
    const next = { ...state, ...patch };
    if ((Object.keys(next) as (keyof HeaderState)[]).every((k) => next[k] === state[k])) return;
    state = next;
    subs.forEach((s) => s());
  },
  subscribe(fn: () => void) { subs.add(fn); return () => { subs.delete(fn); }; },
};
const SERVER: HeaderState = { solid: false, onDark: false, active: null, engine: false };
export const useHeaderState = () => useSyncExternalStore(headerStore.subscribe, headerStore.get, () => SERVER);
