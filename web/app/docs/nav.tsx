"use client";

import { usePathname } from "next/navigation";

const items: [string, string][] = [
  ["Overview", "/docs"],
  ["How it works", "/docs/how-it-works"],
  ["Architecture", "/docs/architecture"],
  ["Security & invariants", "/docs/security"],
  ["Contracts & addresses", "/docs/contracts"],
];

export function DocsNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      <p className="mb-2 px-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
        Documentation
      </p>
      {items.map(([label, href]) => {
        const active = path === href;
        return (
          <a
            key={href}
            href={href}
            className={`rounded-xl px-3 py-2 text-[14px] transition-colors ${
              active
                ? "bg-ink/[0.05] font-medium text-ink"
                : "text-muted hover:bg-ink/[0.03] hover:text-ink"
            }`}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}
