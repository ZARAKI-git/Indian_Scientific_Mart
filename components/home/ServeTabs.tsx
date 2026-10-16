"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import { useMotionEnv } from "@/lib/motion/MotionProvider";
import { gsap } from "@/lib/motion/gsap";
import { unsplash, unsplashSet } from "@/lib/images";

const PANELS = [
  { t: "Schools", p: "Practical kits against the physics, chemistry and biology syllabus, and steady replacement of whatever a class breaks. In a school lab, that is the recurring cost that matters.",
    li: ["Syllabus practical sets", "Breakage replacement through the term", "Small orders welcome"], img: "1639775425635-fd86a889f2a7", alt: "Glassware set out on a teaching bench" },
  { t: "Colleges", p: "Departmental supply against an annual indent: volumetric ware to grade, glassware by the gross, and the heating and support hardware that goes with a teaching bench.",
    li: ["Annual indent supply", "Volumetric ware to grade", "Glassware by the gross"], img: "1643625818238-2169a1a029dd", alt: "Liquid being poured during a procedure" },
  { t: "Research institutes", p: "Repeat supply of consumables and accurate volumetric ware, so a running experiment is not held up waiting on a pipette or a box of filter paper.",
    li: ["Repeat consumables", "Accurate volumetric ware", "Clear stock status on every quote"], img: "1532187863486-abf9dbad1b69", alt: "Researcher at a laboratory bench" },
  { t: "Hospital laboratories", p: "Pathology-bench essentials: centrifuge machines, glass and plastic labware, and the tubes and racks a diagnostic workflow runs through daily.",
    li: ["Digital centrifuges", "Tubes, racks and plastic labware", "GST invoicing"], img: "1608037222022-62649819f8aa", alt: "Laboratory instrument on a clinical bench" },
];

/** Accessible tab switcher (roving tabindex, arrow keys), with the reference's panel entrance. */
export function ServeTabs() {
  const [sel, setSel] = useState(0);
  const env = useMotionEnv();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const show = (i: number, focus = false) => {
    setSel(i);
    requestAnimationFrame(() => {
      const p = panels.current[i];
      if (p && env.animate) gsap.fromTo(p.children, { autoAlpha: 0, y: env.rich ? 24 : 0 }, { autoAlpha: 1, y: 0, duration: .6, stagger: .08, ease: "power3.out" });
      if (focus) tabs.current[i]?.focus();
    });
  };
  const key = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (d) { e.preventDefault(); show((i + d + PANELS.length) % PANELS.length, true); }
  };
  return (
    <>
      <div className="tabs" role="tablist" aria-label="Customer types" data-a>
        {PANELS.map((p, i) => (
          <button key={p.t} role="tab" id={`t${i + 1}`} aria-controls={`p${i + 1}`} aria-selected={sel === i} tabIndex={sel === i ? 0 : -1}
            ref={(el) => { tabs.current[i] = el; }} onClick={() => show(i)} onKeyDown={(e) => key(e, i)}>{p.t}</button>
        ))}
      </div>
      <div className="panels" data-a>
        {PANELS.map((p, i) => (
          <div key={p.t} className="panel" role="tabpanel" id={`p${i + 1}`} aria-labelledby={`t${i + 1}`} hidden={sel !== i}
            ref={(el) => { panels.current[i] = el; }}>
            <div><h3>{p.t}</h3><p>{p.p}</p><ul>{p.li.map((l) => <li key={l}>{l}</li>)}</ul></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={unsplash(p.img, 1100, 70)} srcSet={unsplashSet(p.img, [560, 820, 1100], 70)} sizes="(max-width:980px) 92vw, 46vw" alt={p.alt} loading="lazy" decoding="async" />
          </div>
        ))}
      </div>
    </>
  );
}
