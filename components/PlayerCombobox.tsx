"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flag } from "./Flag";
import type { PlayerGroup } from "@/lib/players";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function PlayerCombobox({
  name,
  groups,
  defaultValue,
  disabled,
  placeholder = "Busca un jugador…",
}: {
  name: string;
  groups: PlayerGroup[];
  defaultValue: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [selected, setSelected] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // cerrar al hacer clic fuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const q = normalize(query.trim());
  const filtered = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        players: normalize(g.team).includes(q)
          ? g.players
          : g.players.filter((p) => normalize(p).includes(q)),
      }))
      .filter((g) => g.players.length > 0);
  }, [groups, q]);

  const flagOf = (playerName: string) =>
    groups.find((g) => g.players.includes(playerName))?.flagCode;

  function choose(player: string) {
    setSelected(player);
    setQuery("");
    setOpen(false);
  }

  const firstMatch = filtered[0]?.players[0];

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={selected} />

      {selected && !open ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="input flex items-center gap-2.5 text-left disabled:opacity-60"
        >
          <Flag code={flagOf(selected)} size={26} />
          <span className="flex-1 truncate font-semibold">{selected}</span>
          {!disabled && (
            <span
              role="button"
              aria-label="Quitar selección"
              className="px-1 text-[var(--muted)] hover:text-[var(--danger)]"
              onClick={(e) => {
                e.stopPropagation();
                setSelected("");
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
              if (firstMatch) choose(firstMatch);
            }
            if (e.key === "Escape") setOpen(false);
          }}
        />
      )}

      {open && !disabled && (
        <div className="absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--bg-card)] shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-sm text-[var(--muted)]">
              Nada con “{query}”. Prueba el apellido o el país.
            </p>
          )}
          {filtered.map((g) => (
            <div key={g.team}>
              <div className="sticky top-0 flex items-center gap-2 border-b border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                <Flag code={g.flagCode} name={g.team} size={18} />
                {g.team}
              </div>
              {g.players.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => choose(p)}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-card-hover)] hover:text-[var(--grass)] ${
                    p === selected ? "text-[var(--grass)]" : ""
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
