/** Device capability tiers, computed once on the client (matches the reference's Env). */
export interface MotionEnv {
  ready: boolean;     // detection ran (false during SSR / first render)
  reduce: boolean;    // prefers-reduced-motion
  coarse: boolean;    // touch-first pointer
  lowEnd: boolean;    // <= 4 cores or <= 4 GB
  /** Rich motion allowed: tilt, parallax, line masks. Off on touch/low-end/reduced. */
  rich: boolean;
  /** Any motion at all (fades). Off only for reduced motion. */
  animate: boolean;
}

export const SSR_ENV: MotionEnv = { ready: false, reduce: false, coarse: false, lowEnd: false, rich: false, animate: false };

export function detectEnv(): MotionEnv {
  const mm = (q: string) => typeof matchMedia === "function" && matchMedia(q).matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const reduce = mm("(prefers-reduced-motion: reduce)");
  const coarse = mm("(pointer: coarse)");
  const lowEnd = (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4;
  return { ready: true, reduce, coarse, lowEnd, rich: !reduce && !coarse && !lowEnd, animate: !reduce };
}
