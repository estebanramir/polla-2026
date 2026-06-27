"use client";

import { useState } from "react";
import Link from "next/link";
import type { RankRow } from "@/lib/leaderboard";

const medal = ["🥇", "🥈", "🥉"];

function Table({
  rows,
  currentId,
  extraLabel,
  extraValue,
  showBadge,
}: {
  rows: RankRow[];
  currentId: string;
  extraLabel: string;
  extraValue: (r: RankRow) => number;
  showBadge: boolean;
}) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-[var(--muted)]">
            <th className="px-3 py-3 sm:px-4">#</th>
            <th className="px-3 py-3 sm:px-4">Jugador</th>
            <th className="hidden px-4 py-3 text-center sm:table-cell">Exactos</th>
            <th className="hidden px-4 py-3 text-center sm:table-cell">Aciertos</th>
            <th className="hidden px-4 py-3 text-center sm:table-cell">{extraLabel}</th>
            <th className="px-3 py-3 text-right sm:px-4">Puntos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const extra = extraValue(r);
            return (
              <tr
                key={r.id}
                className={`border-b border-[var(--line)] last:border-0 ${
                  r.id === currentId ? "bg-[rgba(47,224,124,0.07)]" : ""
                }`}
              >
                <td className="px-3 py-3 font-display text-lg sm:px-4">
                  <span className="flex items-center gap-1.5">
                    {r.position <= 3 && <span>{medal[r.position - 1]}</span>}
                    <span>{r.position}</span>
                  </span>
                </td>
                <td className="px-3 py-3 font-semibold sm:px-4">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/jugador/${r.id}`}
                      className="hover:text-[var(--grass)] hover:underline"
                    >
                      {r.name}
                    </Link>
                    {r.id === currentId && (
                      <span className="text-xs text-[var(--grass)]">(tú)</span>
                    )}
                    {showBadge && r.badge && (
                      <span className="chip chip-gold">{r.badge}</span>
                    )}
                  </span>
                  <div className="text-[11px] font-normal text-[var(--muted)] sm:hidden">
                    {r.exacts} exactos · {r.outcomes} aciertos
                    {extra !== 0 ? ` · ${extra > 0 ? "+" : ""}${extra} ${extraLabel.toLowerCase()}` : ""}
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-center tabular-nums sm:table-cell">
                  {r.exacts}
                </td>
                <td className="hidden px-4 py-3 text-center tabular-nums sm:table-cell">
                  {r.outcomes}
                </td>
                <td className="hidden px-4 py-3 text-center tabular-nums sm:table-cell">
                  {extra !== 0 ? `${extra > 0 ? "+" : ""}${extra}` : "–"}
                </td>
                <td className="px-3 py-3 text-right font-display text-xl text-[var(--gold)] tabular-nums sm:px-4">
                  {r.total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RankingTabs({
  groups,
  finals,
  currentId,
}: {
  groups: RankRow[];
  finals: RankRow[];
  currentId: string;
}) {
  const [tab, setTab] = useState<"grupos" | "finales">("grupos");

  return (
    <div>
      <div className="mb-4 inline-flex overflow-hidden rounded-full border border-[var(--line)]">
        {(
          [
            ["grupos", "Fase de grupos"],
            ["finales", "Eliminatorias"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 text-xs font-semibold ${
              tab === key
                ? "bg-[var(--grass)] text-[#06150d]"
                : "text-[var(--muted)] hover:text-[var(--cream)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm text-[var(--muted)]">
        {tab === "grupos"
          ? "Puntos de los pronósticos de la fase de grupos (más ajustes)."
          : "Puntos de los pronósticos de eliminatorias más los premios (campeón, subcampeón, goleador, arquero)."}
      </p>

      {tab === "grupos" ? (
        <Table
          rows={groups}
          currentId={currentId}
          extraLabel="Ajuste"
          extraValue={(r) => r.adjustment}
          showBadge
        />
      ) : (
        <Table
          rows={finals}
          currentId={currentId}
          extraLabel="Premios"
          extraValue={(r) => r.awardPts}
          showBadge={false}
        />
      )}
    </div>
  );
}
