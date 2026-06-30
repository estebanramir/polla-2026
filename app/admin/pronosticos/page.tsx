import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { predictionPoints, POINTS } from "@/lib/scoring";
import { STAGE_LABELS } from "@/lib/labels";
import { Flag } from "@/components/Flag";
import { LocalTime } from "@/components/LocalTime";
import { AdminPredCell } from "@/components/AdminPredCell";

export const dynamic = "force-dynamic";

export default async function AdminPronosticosPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.isAdmin) redirect("/");

  const [users, matches, settings, teams] = await Promise.all([
    prisma.user.findMany({
      include: { predictions: true, awardPrediction: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.match.findMany({
      include: { homeTeam: true, awayTeam: true },
      orderBy: [{ kickoff: "asc" }, { id: "asc" }],
    }),
    prisma.setting.findMany(),
    prisma.team.findMany({ select: { id: true, name: true } }),
  ]);

  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const settingMap = new Map(settings.map((s) => [s.key, s.value]));

  // predicción de cada usuario por partido
  const predIndex = new Map<string, Map<number, { homeScore: number; awayScore: number }>>();
  for (const u of users) {
    predIndex.set(u.id, new Map(u.predictions.map((p) => [p.matchId, p])));
  }

  // solo partidos con ambos equipos definidos (los placeholders no aportan)
  const playableMatches = matches.filter((m) => m.homeTeamId && m.awayTeamId);

  function cellColor(pts: number | null) {
    if (pts == null) return "";
    if (pts >= POINTS.exact) return "bg-[rgba(47,224,124,0.18)] text-[var(--grass)]";
    if (pts === POINTS.knockoutFinal) return "bg-[rgba(47,224,124,0.10)] text-[var(--grass)]";
    if (pts === POINTS.outcome) return "bg-[rgba(242,193,78,0.15)] text-[var(--gold)]";
    if (pts === 0) return "text-[var(--muted)]";
    return "";
  }

  return (
    <div className="rise">
      <Link href="/admin" className="text-sm text-[var(--muted)] hover:text-[var(--cream)]">
        ← Admin
      </Link>
      <h1 className="font-display mt-2 mb-1 text-4xl text-[var(--gold)]">PRONÓSTICOS</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Todos los pronósticos de los {users.length} jugadores.{" "}
        <span className="text-[var(--grass)]">Verde</span> = marcador exacto,{" "}
        <span className="text-[var(--gold)]">dorado</span> = acertó ganador.{" "}
        <strong>Toca cualquier celda</strong> para editar ese pronóstico (con
        confirmación). Desliza para ver a todos.
      </p>

      {/* Premios por jugador */}
      <h2 className="font-display mb-3 text-xl">PREMIOS</h2>
      <div className="card mb-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-[var(--muted)]">
              <th className="px-3 py-2">Jugador</th>
              <th className="px-3 py-2">🏆 Campeón</th>
              <th className="px-3 py-2">🥈 Subcampeón</th>
              <th className="px-3 py-2">⚽ Goleador</th>
              <th className="px-3 py-2">🧤 Arquero</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--line)] last:border-0">
                <td className="whitespace-nowrap px-3 py-2 font-semibold">
                  {u.displayName}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {u.awardPrediction?.champion
                    ? (teamName.get(u.awardPrediction.champion) ?? "—")
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {u.awardPrediction?.runnerUp
                    ? (teamName.get(u.awardPrediction.runnerUp) ?? "—")
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {u.awardPrediction?.topScorer || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {u.awardPrediction?.bestKeeper || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Matriz de marcadores */}
      <h2 className="font-display mb-3 text-xl">MARCADORES</h2>
      <div className="card max-h-[75vh] overflow-auto">
        <table className="text-xs">
          <thead>
            <tr className="text-[var(--muted)]">
              <th className="sticky left-0 top-0 z-30 border-b border-[var(--line)] bg-[var(--bg-card)] px-3 py-2 text-left">
                Partido
              </th>
              <th className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg-card)] px-2 py-2 text-center">
                Real
              </th>
              {users.map((u) => (
                <th
                  key={u.id}
                  className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg-card)] px-2 py-2 text-center font-semibold"
                >
                  <span className="block max-w-20 truncate" title={u.displayName}>
                    {u.displayName}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {playableMatches.map((m) => {
              const hasResult = m.homeScore != null && m.awayScore != null;
              const result = hasResult
                ? { homeScore: m.homeScore!, awayScore: m.awayScore! }
                : null;
              const matchLabel = `${m.homeTeam?.name} vs ${m.awayTeam?.name}`;
              return (
                <tr key={m.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-[var(--bg-card)] px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <Flag code={m.homeTeam?.flagCode} name={m.homeTeam?.name} size={16} />
                      <span className="font-semibold">{m.homeTeam?.id}</span>
                      <span className="text-[var(--muted)]">vs</span>
                      <span className="font-semibold">{m.awayTeam?.id}</span>
                      <Flag code={m.awayTeam?.flagCode} name={m.awayTeam?.name} size={16} />
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">
                      P{m.id} · {m.group ? `Grupo ${m.group}` : STAGE_LABELS[m.stage]} ·{" "}
                      <LocalTime iso={m.kickoff.toISOString()} />
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center font-display text-sm text-[var(--gold)]">
                    {hasResult ? `${m.homeScore}-${m.awayScore}` : "–"}
                  </td>
                  {users.map((u) => {
                    const pred = predIndex.get(u.id)?.get(m.id) ?? null;
                    const pts = pred && result ? predictionPoints(pred, m) : null;
                    return (
                      <td key={u.id} className="p-0">
                        <AdminPredCell
                          userId={u.id}
                          userName={u.displayName}
                          matchId={m.id}
                          matchLabel={matchLabel}
                          initialHome={pred?.homeScore ?? null}
                          initialAway={pred?.awayScore ?? null}
                          colorClass={cellColor(pts)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
