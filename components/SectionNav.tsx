"use client";

import { useEffect, useRef, useState } from "react";

export type NavItem = { id: string; title: string };

export function SectionNav({
  items,
  highlightId,
}: {
  items: NavItem[];
  /** id que siempre va en dorado (ej. "hoy"), aunque no esté activo */
  highlightId?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // scroll-spy: marca la sección visible más cercana al tope
  useEffect(() => {
    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -65% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  // mantener el chip activo a la vista dentro del nav horizontal
  useEffect(() => {
    if (!active || !navRef.current) return;
    const chip = navRef.current.querySelector<HTMLElement>(`[data-nav="${active}"]`);
    chip?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  return (
    <div ref={navRef} className="flex items-center gap-1.5">
      {items.map((s) => {
        const isActive = active === s.id;
        const isHighlight = s.id === highlightId;
        return (
          <a
            key={s.id}
            data-nav={s.id}
            href={`#${s.id}`}
            onClick={() => setActive(s.id)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors ${
              isActive
                ? "border-[var(--grass)] bg-[var(--grass)] font-semibold text-[#06150d]"
                : isHighlight
                  ? "border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--bg-card)]"
                  : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--grass-dim)] hover:text-[var(--cream)]"
            }`}
          >
            {s.title}
          </a>
        );
      })}
    </div>
  );
}
