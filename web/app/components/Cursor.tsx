"use client";

/* Custom cursor: ink dot + trailing emerald ring; ring swells over links/buttons.
   Desktop pointer devices only; native cursor stays (accessibility). */

import { useEffect, useRef } from "react";

export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const d = dot.current!, r = ring.current!;
    d.style.opacity = r.style.opacity = "1";
    let x = -100, y = -100, rx = -100, ry = -100, hov = false, raf = 0;

    const move = (e: MouseEvent) => {
      x = e.clientX; y = e.clientY;
      hov = !!(e.target as HTMLElement).closest?.("a,button,[role=button],input,label");
    };
    const loop = () => {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      d.style.transform = `translate(${x - 3}px, ${y - 3}px)`;
      const s = hov ? 34 : 22;
      r.style.transform = `translate(${rx - s / 2}px, ${ry - s / 2}px)`;
      r.style.width = r.style.height = `${s}px`;
      r.style.borderColor = hov ? "#1EA84D" : "rgba(23,25,27,0.35)";
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", move);
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener("mousemove", move); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] hidden lg:block">
      <div ref={dot} className="absolute h-1.5 w-1.5 rounded-full bg-ink opacity-0" />
      <div
        ref={ring}
        className="absolute rounded-full border opacity-0 transition-[width,height,border-color] duration-200"
        style={{ width: 22, height: 22 }}
      />
    </div>
  );
}
