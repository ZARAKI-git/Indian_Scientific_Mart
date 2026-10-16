import Image from "next/image";
import { CategoryIcon } from "./CategoryIcon";

/**
 * Real photo when products.image_url is set (served through next/image: AVIF/WebP,
 * responsive srcset, lazy, blur-up); otherwise a clean branded placeholder.
 */
const BLUR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNFMEYyRkUiLz48L3N2Zz4=";

export function ProductImage({ src, alt, category, large, priority }: { src: string | null; alt: string; category?: string | null; large?: boolean; priority?: boolean }) {
  if (!src) return <div className={`ph${large ? " lg" : ""}`} role="img" aria-label={`${alt} (no photo yet)`}><CategoryIcon slug={category} /></div>;
  return (
    <Image src={src} alt={alt} fill sizes={large ? "(max-width:980px) 92vw, 44vw" : "52px"} placeholder="blur" blurDataURL={BLUR}
      priority={priority} style={{ objectFit: "cover" }} />
  );
}
