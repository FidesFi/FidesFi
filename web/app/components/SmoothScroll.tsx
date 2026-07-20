"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/** Site-wide inertia scroll (Lenis). No-ops under prefers-reduced-motion. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.11 });
    // expose for tooling/integrations (GSAP ScrollTrigger, e2e checks)
    (window as unknown as { lenis?: Lenis }).lenis = lenis;

    // route anchor clicks through Lenis so #jumps glide and clear the floating nav
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const id = a.getAttribute("href")!;
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: -96, duration: 1.1 });
    };
    document.addEventListener("click", onClick);

    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, []);
  return null;
}
