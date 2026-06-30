import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { predictionPoints } from "@/lib/scoring";
import { STAGE_LABELS, slotLabel } from "@/lib/labels";
import { MatchCard, type MatchView } from "@/components/MatchCard";
import { Flag } from "@/components/Flag";

export const dynamic = "force-dynamic";

export default async function EquipoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) notFound();

  const [matches, predictions] = await Promise.all([
    prisma.match.findMany({
      where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
      include: { homeTeam: true, awayTeam: true },
      orderBy: [{ kickoff: "asc" }, { id: "asc" }],
    }),
    prisma.prediction.findMany({ where: { userId: user.id } }),
  ]);

  const predByMatch = new Map(predictions.map((p) => [p.matchId, p]));
  const now = new Date();

  const toView = (m: (typeof matches)[number]): MatchView => {
    const pred = predByMatch.get(m.id) ?? null;
    const hasResult = m.homeScore != null && m.awayScore != null;
    return {
      id: m.id,
      kickoff: m.kickoff.toISOString(),
      venue: m.venue,
      stageLabel: STAGE_LABELS[m.stage] ?? m.stage,
      group: m.group,
      home: m.homeTeam
        ? { id: m.homeTeam.id, name: m.homeTeam.name, flagCode: m.homeTeam.flagCode }
        : null,
      away: m.awayTeam
        ? { id: m.awayTeam.id, name: m.awayTeam.name, flagCode: m.awayTeam.flagCode }
        : null,
      homeSlotLabel: slotLabel(m.homeSlot),
      awaySlotLabel: slotLabel(m.awaySlot),
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      locked: m.kickoff <= now,
      prediction: pred ? { homeScore: pred.homeScore, awayScore: pred.awayScore } : null,
      points: hasResult && pred ? predictionPoints(pred, m) : null,
    };
  };

  // récord del equipo (solo partidos jugados)
  let w = 0,
    d = 0,
    l = 0;
  for (const m of matches) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const isHome = m.homeTeamId === id;
    const gf = isHome ? m.homeScore : m.awayScore;
    const gc = isHome ? m.awayScore : m.homeScore;
    if (gf > gc) w++;
    else if (gf < gc) l++;
    else d++;
  }
  const played = w + d + l;

  return (
    <div className="rise">
      <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--cream)]">
        ← Partidos
      </Link>

      <div className="mt-3 mb-8 flex items-center gap-4">
        <Flag code={team.flagCode} name={team.name} size={64} />
        <div>
          <h1 className="font-display text-4xl">{team.name.toUpperCase()}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {team.group ? `Grupo ${team.group}` : "Selección"}
            {played > 0 && ` · ${w}G ${d}E ${l}P en ${played} jugados`}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {matches.map((m) => (
          <MatchCard key={m.id} match={toView(m)} />
        ))}
      </div>
    </div>
  );
}
