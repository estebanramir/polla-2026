"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flag } from "./Flag";
import type { TeamOption } from "@/lib/teams";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function TeamCombobox({
  name,
  teams,
  defaultValue,
  disabled,
  placeholder = "Busca un equipo…",
}: {
  name: string;
  teams: TeamOption[];
  defaultValue: string; // id del equipo
  disabled?: boolean;
  placeholder?: string;
}) {
  const [selectedId, setSelectedId] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const q = normalize(query.trim());
  const filtered = useMemo(
    () => (q ? teams.filter((t) => normalize(t.name).includes(q)) : teams),
    [teams, q]
  );
  const selected = teams.find((t) => t.id === selectedId);

  function choose(id: string) {
    setSelectedId(id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={selectedId} />

      {selected && !open ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="input flex items-center gap-2.5 text-left disabled:opacity-60"
        >
          <Flag code={selected.flagCode} name={selected.name} size={26} />
          <span className="flex-1 truncate font-semibold">{selected.name}</span>
          {!disabled && (
            <span
              role="button"
              aria-label="Quitar selección"
              className="px-1 text-[var(--muted)] hover:text-[var(--danger)]"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId("");
                setOpen(true);
              }}
            >
              ✕
            </span>
          )}
        </button>
      ) : (
        <input
          type="text"
          className="input"
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[0]) choose(filtered[0].id);
            }
            if (e.key === "Escape") setOpen(false);
          }}
        />
      )}

      {open && !disabled && (
        <div className="absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--bg-card)] shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-sm text-[var(--muted)]">Sin resultados.</p>
          )}
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => choose(t.id)}
              className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm hover:bg-[var(--bg-card-hover)] hover:text-[var(--grass)] ${
                t.id === selectedId ? "text-[var(--grass)]" : ""
              }`}
            >
              <Flag code={t.flagCode} name={t.name} size={22} />
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
