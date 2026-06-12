import { Flag } from "./Flag";
import type { StandingRow } from "@/lib/standings";

export function GroupTable({
  rows,
  teams,
}: {
  rows: StandingRow[];
  teams: Map<string, { name: string; flagCode: string }>;
}) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--line)] text-left uppercase tracking-wider text-[var(--muted)]">
            <th className="px-3 py-2" colSpan={2}>
              Posiciones
            </th>
            <th className="px-1.5 py-2 text-center" title="Jugados">PJ</th>
            <th className="hidden px-1.5 py-2 text-center sm:table-cell" title="Ganados">G</th>
            <th className="hidden px-1.5 py-2 text-center sm:table-cell" title="Empatados">E</th>
            <th className="hidden px-1.5 py-2 text-center sm:table-cell" title="Perdidos">P</th>
            <th className="px-1.5 py-2 text-center" title="Diferencia de gol">DG</th>
            <th className="px-3 py-2 text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const team = teams.get(r.teamId);
            // 1° y 2° clasifican directo; 3° puede entrar entre los mejores
            const zone =
              i < 2
                ? "border-l-2 border-l-[var(--grass)]"
                : i === 2
                  ? "border-l-2 border-l-[var(--gold)]"
                  : "border-l-2 border-l-transparent";
            return (
              <tr key={r.teamId} className={`border-b border-[var(--line)] last:border-0 ${zone}`}>
                <td className="w-7 px-3 py-1.5 text-[var(--muted)]">{i + 1}</td>
                <td className="px-1 py-1.5">
                  <span className="flex items-center gap-2 font-semibold">
                    <Flag code={team?.flagCode} name={team?.name} size={22} />
                    {team?.name ?? r.teamId}
                  </span>
                </td>
                <td className="px-1.5 py-1.5 text-center tabular-nums">{r.pj}</td>
                <td className="hidden px-1.5 py-1.5 text-center tabular-nums sm:table-cell">{r.pg}</td>
                <td className="hidden px-1.5 py-1.5 text-center tabular-nums sm:table-cell">{r.pe}</td>
                <td className="hidden px-1.5 py-1.5 text-center tabular-nums sm:table-cell">{r.pp}</td>
                <td className="px-1.5 py-1.5 text-center tabular-nums">
                  {r.dg > 0 ? `+${r.dg}` : r.dg}
                </td>
                <td className="px-3 py-1.5 text-right font-display text-sm text-[var(--gold)] tabular-nums">
                  {r.pts}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
