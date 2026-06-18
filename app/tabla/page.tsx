import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/leaderboard";
import { POINTS } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function TablaPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const rows = await getLeaderboard();
  const medal = ["🥇", "🥈", "🥉"];

  return (
    <div className="rise">
      <h1 className="font-display mb-1 text-4xl text-[var(--gold)]">RANKING</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Exacto {POINTS.exact} · Ganador/empate {POINTS.outcome} · Campeón{" "}
        {POINTS.champion} · Subcampeón {POINTS.runnerUp} · Goleador {POINTS.topScorer} ·
        Arquero {POINTS.bestKeeper} pts
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-[var(--muted)]">
              <th className="px-3 py-3 sm:px-4">#</th>
              <th className="px-3 py-3 sm:px-4">Jugador</th>
              <th className="hidden px-4 py-3 text-center sm:table-cell">Exactos</th>
              <th className="hidden px-4 py-3 text-center sm:table-cell">Aciertos</th>
              <th className="hidden px-4 py-3 text-center sm:table-cell">Premios</th>
              <th className="px-3 py-3 text-right sm:px-4">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className={`border-b border-[var(--line)] last:border-0 ${
                  r.id === current.id ? "bg-[rgba(47,224,124,0.07)]" : ""
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
                    {r.id === current.id && (
                      <span className="text-xs text-[var(--grass)]">(tú)</span>
                    )}
                    {r.badge && <span className="chip chip-gold">{r.badge}</span>}
                  </span>
                  <div className="text-[11px] font-normal text-[var(--muted)] sm:hidden">
                    {r.exacts} exactos · {r.outcomes} aciertos
                    {r.awardPts > 0 ? ` · +${r.awardPts} premios` : ""}
                    {r.adjustment !== 0
                      ? ` · ${r.adjustment > 0 ? "+" : ""}${r.adjustment} ajuste`
                      : ""}
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-center tabular-nums sm:table-cell">
                  {r.exacts}
                </td>
                <td className="hidden px-4 py-3 text-center tabular-nums sm:table-cell">
                  {r.outcomes}
                </td>
                <td className="hidden px-4 py-3 text-center tabular-nums sm:table-cell">
                  {r.awardPts > 0 ? `+${r.awardPts}` : "–"}
                </td>
                <td className="px-3 py-3 text-right font-display text-xl text-[var(--gold)] tabular-nums sm:px-4">
                  {r.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
