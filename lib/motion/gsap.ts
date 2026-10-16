"use client";
/** Single place GSAP and its plugins are imported and registered (GSAP 3.13: all plugins free). */
import { gsap } from "gsap";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

let registered = false;
export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, SplitText, Observer, useGSAP);
  registered = true;
}

export { gsap, Observer, ScrollTrigger, SplitText, useGSAP };
