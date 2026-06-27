import { Flag } from "./Flag";
import type { ThirdRow } from "@/lib/knockout";

export function ThirdPlaceTable({
  rows,
  teams,
  allComplete,
}: {
  rows: ThirdRow[];
  teams: Map<string, { name: string; flagCode: string }>;
  allComplete: boolean;
}) {
  if (rows.every((r) => r.pj === 0)) {
    return (
      <p className="card p-4 text-sm text-[var(--muted)]">
        La tabla aparecerá cuando los grupos empiecen a jugarse.
      </p>
    );
  }

  return (
    <div>
      {!allComplete && (
        <p className="mb-2 text-xs text-[var(--muted)]">
          ⏳ Provisional — cambia con cada resultado hasta que terminen todos los grupos.
        </p>
      )}
      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--line)] text-left uppercase tracking-wider text-[var(--muted)]">
              <th className="px-3 py-2" colSpan={2}>
                Mejores terceros
              </th>
              <th className="px-2 py-2 text-center">Gr</th>
              <th className="px-2 py-2 text-center" title="Jugados">PJ</th>
              <th className="px-2 py-2 text-center" title="Diferencia de gol">DG</th>
              <th className="px-2 py-2 text-center" title="Goles a favor">GF</th>
              <th className="px-3 py-2 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const team = teams.get(r.teamId);
              return (
                <tr
                  key={r.teamId}
                  className={`border-b border-[var(--line)] last:border-0 ${
                    r.qualified
                      ? "border-l-2 border-l-[var(--grass)]"
                      : "border-l-2 border-l-transparent opacity-60"
                  }`}
                >
                  <td className="w-7 px-3 py-1.5 text-[var(--muted)]">{i + 1}</td>
                  <td className="px-1 py-1.5">
                    <span className="flex items-center gap-2 font-semibold">
                      <Flag code={team?.flagCode} name={team?.name} size={22} />
                      {team?.name ?? r.teamId}
                      {r.qualified && (
                        <span className="text-[10px] text-[var(--grass)]">✓ clasifica</span>
                      )}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">{r.group}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums">{r.pj}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums">
                    {r.dg > 0 ? `+${r.dg}` : r.dg}
                  </td>
                  <td className="px-2 py-1.5 text-center tabular-nums">{r.gf}</td>
                  <td className="px-3 py-1.5 text-right font-display text-sm text-[var(--gold)] tabular-nums">
                    {r.pts}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
