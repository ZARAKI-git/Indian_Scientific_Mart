"use client";
import { useMemo, useRef } from "react";
import { useMotionEnv } from "@/lib/motion/MotionProvider";
import { gsap } from "@/lib/motion/gsap";
import { useSceneEvents } from "./useSceneEvents";

const S = (d: string) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />;
const STEPS = [
  { k: "Step 01", h: "Enquiry", p: "Send a list, typed or as a photo of a handwritten indent. Mention quantities and grade if it matters.",
    i: '<path d="M6 3h9l4 4v14H6z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 11h7M9 15h7M9 7h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' },
  { k: "Step 02", h: "Quote", p: "Priced against what is in stock, with anything unavailable named up front.",
    i: '<path d="M4 4h16v16H4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 9h8M8 13h5M14 16l2 2 3-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' },
  { k: "Step 03", h: "Supply", p: "Items are picked and packed for transport, with glassware boxed to survive the journey.",
    i: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 8l9 5 9-5M12 13v8" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' },
  { k: "Step 04", h: "Delivery", p: "Despatched to your institution, invoiced against the GST registration.",
    i: '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="6" cy="18" r="2" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="18" r="2" stroke="currentColor" stroke-width="1.6"/>' },
];

/** The reference's Steps: a progress line lights each step in turn. */
export function OrderingSteps() {
  const ref = useRef<HTMLOListElement>(null);
  const env = useMotionEnv();
  const events = useMemo(() => ({
    enter: () => {
      const ol = ref.current;
      if (!ol) return;
      const steps = Array.from(ol.querySelectorAll(".step"));
      steps.forEach((s) => s.classList.remove("lit"));
      if (!env.animate) { steps.forEach((s) => s.classList.add("lit")); return; }
      const tl = gsap.timeline({ delay: .5 });
      tl.fromTo(ol.querySelector("#stepLine"), { scaleX: 0 }, { scaleX: 1, duration: 2.2, ease: "power1.inOut" });
      steps.forEach((s, i) => tl.call(() => s.classList.add("lit"), undefined, i * .6));
    },
  }), [env.animate]);
  useSceneEvents(ref, events);
  return (
    <ol className="steps" id="steps" ref={ref}>
      <li className="line" aria-hidden="true"><i id="stepLine" /></li>
      {STEPS.map((s) => (
        <li className="step" data-a key={s.k}><span className="ico">{S(s.i)}</span><span className="k">{s.k}</span><h3>{s.h}</h3><p>{s.p}</p></li>
      ))}
    </ol>
  );
}
