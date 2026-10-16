"use client";
/**
 * Client-side quote list. One store, persisted to localStorage (every access
 * wrapped: private mode, blocked storage and quota errors fall back to memory).
 * Components subscribe through useQuoteCart(); nothing else touches storage.
 */
import { useSyncExternalStore } from "react";

export interface CartItem {
  productId: number;
  name: string;
  code: string;
  brand: string;
  packSize: string | null;
  listRate: number | null;
  priceOnRequest: boolean;
  qty: number;
  note: string;
}

const KEY = "ism.quote.v1";
const MAX_ITEMS = 200;
let items: CartItem[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    if (Array.isArray(parsed)) items = parsed.filter((i) => Number.isInteger(i.productId) && i.qty > 0).slice(0, MAX_ITEMS);
  } catch {
    items = [];
  }
}

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable: the list still works for this visit */
  }
  listeners.forEach((l) => l());
}

const clampQty = (n: number) => Math.min(100000, Math.max(1, Math.round(Number.isFinite(n) ? n : 1)));

export const cart = {
  add(item: Omit<CartItem, "qty" | "note">, qty = 1) {
    load();
    const hit = items.find((i) => i.productId === item.productId);
    items = hit
      ? items.map((i) => (i.productId === item.productId ? { ...i, qty: clampQty(i.qty + qty) } : i))
      : [...items, { ...item, qty: clampQty(qty), note: "" }].slice(-MAX_ITEMS);
    save();
  },
  setQty(id: number, qty: number) { load(); items = items.map((i) => (i.productId === id ? { ...i, qty: clampQty(qty) } : i)); save(); },
  setNote(id: number, note: string) { load(); items = items.map((i) => (i.productId === id ? { ...i, note: note.slice(0, 300) } : i)); save(); },
  remove(id: number) { load(); items = items.filter((i) => i.productId !== id); save(); },
  clear() { items = []; save(); },
};

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { loaded = false; load(); fn(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
}
const EMPTY: CartItem[] = [];
const snapshot = () => { load(); return items; };

export function useQuoteCart(): CartItem[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
