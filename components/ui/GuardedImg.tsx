"use client";
import { useRef, type ImgHTMLAttributes } from "react";
import { GOOD_IMAGES, unsplash } from "@/lib/images";

let n = 0;
/** The reference's ImageGuard: swap a failed image for a known-good one once, then hide its figure. */
export function GuardedImg(props: ImgHTMLAttributes<HTMLImageElement> & { hideSelector?: string }) {
  const { hideSelector = ".win", alt = "", ...rest } = props;
  const tried = useRef(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} decoding="async" {...rest}
      onError={(e) => {
        const img = e.currentTarget;
        if (tried.current) { const f = img.closest<HTMLElement>(hideSelector); if (f) f.style.display = "none"; return; }
        tried.current = true;
        img.removeAttribute("srcset");
        img.src = unsplash(GOOD_IMAGES[n++ % GOOD_IMAGES.length]!, 700, 65);
      }} />
  );
}
