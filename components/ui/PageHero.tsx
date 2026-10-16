import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { Parallax } from "@/components/motion/Parallax";
import { HeaderTone } from "./HeaderTone";
import { unsplash, unsplashSet } from "@/lib/images";

export interface Crumb { href?: string; label: string }

/**
 * Natural-scroll page hero in the reference's vocabulary (tag, split heading, lede, stats).
 * `aside` adds a right-hand column on desktop that stacks below the copy on narrow screens.
 */
export function PageHero({ tag, title, lede, crumbs, deep, image, aside, children }: {
  tag: string; title: ReactNode; lede?: ReactNode; crumbs?: Crumb[]; deep?: boolean; image?: string; aside?: ReactNode; children?: ReactNode;
}) {
  const copy = (
    <>
      {crumbs && (
        <nav className="crumbs" aria-label="Breadcrumb" data-a>
          {crumbs.map((c, i) => (
            <span key={i}>{c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}{i < crumbs.length - 1 ? " /" : ""}</span>
          ))}
        </nav>
      )}
      <span className="tag" data-a>{tag}</span>
      <h1 data-split>{title}</h1>
      {lede && <p className="lede" data-a>{lede}</p>}
      {children}
    </>
  );
  return (
    <section className={`page-hero${deep ? " deep" : ""}`}>
      {deep && <HeaderTone dark />}
      {deep ? <div className="deep-glow" /> : <><div className="sky-bg" /><div className="grid-bg" /></>}
      {image && (
        <Parallax className="hero-media" amount={14}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unsplash(image, 1600, 60)} srcSet={unsplashSet(image, [800, 1200, 1600], 60)} sizes="100vw" alt="" fetchPriority="high" />
        </Parallax>
      )}
      <Reveal className={`wrap${aside ? " page-hero-split" : ""}`} style={{ position: "relative", zIndex: 1 }}>
        {aside ? <><div className="ph-copy">{copy}</div><div className="ph-aside">{aside}</div></> : copy}
      </Reveal>
    </section>
  );
}
