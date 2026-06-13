import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { matchPoints } from "@/lib/scoring";
import { STAGE_LABELS, slotLabel } from "@/lib/labels";
import { computeStandings } from "@/lib/standings";
import { syncResults } from "@/lib/sync";
import { getLeaderboard } from "@/lib/leaderboard";
import { MatchCard, type MatchView } from "@/components/MatchCard";
import { GroupTable } from "@/components/GroupTable";

export const dynamic = "force-dynamic";

const GROUPS = "ABCDEFGHIJKL".split("");
const KO_STAGES = ["R32", "R16", "QF", "SF", "THIRD", "FINAL"];

// agrupación de días en esta zona horaria (configurable por env)
const TZ = process.env.TZ_DISPLAY ?? "America/Costa_Rica";

function dayKey(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function dayLabel(d: Date) {
  return new Intl.DateTimeFormat("es", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const vista = (await searchParams).vista === "fecha" ? "fecha" : "grupo";

  // Sincroniza resultados reales (máx. cada 10 min); si falla, la página sigue
  try {
    await syncResults();
  } catch (e) {
    console.error("syncResults falló:", e);
  }

  const [matches, predictions, teams, leaderboard] = await Promise.all([
    prisma.match.findMany({
      include: { homeTeam: true, awayTeam: true },
      orderBy: [{ kickoff: "asc" }, { id: "asc" }],
    }),
    prisma.prediction.findMany({ where: { userId: user.id } }),
    prisma.team.findMany(),
    getLeaderboard(),
  ]);

  const teamInfo = new Map(teams.map((t) => [t.id, { name: t.name, flagCode: t.flagCode }]));
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
      home: m.homeTeam ? { name: m.homeTeam.name, flagCode: m.homeTeam.flagCode } : null,
      away: m.awayTeam ? { name: m.awayTeam.name, flagCode: m.awayTeam.flagCode } : null,
      homeSlotLabel: slotLabel(m.homeSlot),
      awaySlotLabel: slotLabel(m.awaySlot),
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      locked: m.kickoff <= now,
      prediction: pred ? { homeScore: pred.homeScore, awayScore: pred.awayScore } : null,
      points:
        hasResult && pred
          ? matchPoints(pred, { homeScore: m.homeScore!, awayScore: m.awayScore! })
          : null,
    };
  };

  const groupSections = GROUPS.map((g) => {
    const groupMatches = matches.filter((m) => m.stage === "GROUP" && m.group === g);
    return {
      id: `grupo-${g.toLowerCase()}`,
      title: `Grupo ${g}`,
      matches: groupMatches.map(toView),
      standings: computeStandings(
        teams.filter((t) => t.group === g),
        groupMatches
      ),
    };
  });

  const koSections = KO_STAGES.map((stage) => ({
    id: stage.toLowerCase(),
    title: STAGE_LABELS[stage],
    matches: matches.filter((m) => m.stage === stage).map(toView),
    standings: null,
  })).filter((s) => s.matches.length > 0);

  // vista por fecha: secciones por día calendario
  const todayKey = dayKey(now);
  const tomorrowKey = dayKey(new Date(now.getTime() + 24 * 3600 * 1000));
  const dayMap = new Map<string, { label: string; matches: MatchView[] }>();
  for (const m of matches) {
    const key = dayKey(m.kickoff);
    const entry = dayMap.get(key) ?? { label: dayLabel(m.kickoff), matches: [] };
    entry.matches.push(toView(m));
    dayMap.set(key, entry);
  }
  const daySections = [...dayMap.entries()].map(([key, { label, matches: ms }]) => ({
    id: key === todayKey ? "hoy" : `dia-${key}`,
    key,
    title:
      key === todayKey ? "Hoy" : key === tomorrowKey ? "Mañana" : label,
    subtitle: label,
    matches: ms,
  }));

  const openCount = matches.filter((m) => m.kickoff > now).length;
  const predCount = predictions.length;
  const top3 = leaderboard.slice(0, 3);
  const myPos = leaderboard.findIndex((r) => r.id === user.id) + 1;
  const medal = ["🥇", "🥈", "🥉"];

  const navItems =
    vista === "fecha"
      ? daySections.map((s) => ({ id: s.id, title: s.title }))
      : [...groupSections, ...koSections].map((s) => ({ id: s.id, title: s.title }));

  return (
    <div>
      <div className="rise mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">
            HOLA, <span className="text-[var(--grass)]">{user.displayName.toUpperCase()}</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Llevas {predCount} de 104 pronósticos · {openCount} partidos abiertos ·
            los resultados se actualizan solos.
          </p>
        </div>

        <Link href="/tabla" className="card card-hover flex items-center gap-4 px-5 py-3">
          <div className="flex flex-col gap-0.5 text-sm">
            {top3.map((r, i) => (
              <span key={r.id} className="flex items-center gap-2">
                <span>{medal[i]}</span>
                <span className="max-w-32 truncate font-semibold">{r.name}</span>
                <span className="font-display text-[var(--gold)]">{r.total}</span>
              </span>
            ))}
          </div>
          <div className="border-l border-[var(--line)] pl-4 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
              Tu puesto
            </div>
            <div className="font-display text-3xl text-[var(--grass)]">
              {myPos > 0 ? `${myPos}°` : "–"}
            </div>
          </div>
        </Link>
      </div>

      <nav className="sticky top-[57px] z-40 -mx-4 mb-8 flex items-center gap-1.5 overflow-x-auto border-b border-[var(--line)] bg-[rgba(10,20,16,0.92)] px-4 py-2.5 backdrop-blur">
        <div className="mr-2 flex shrink-0 overflow-hidden rounded-full border border-[var(--line)]">
          <Link
            href="/"
            className={`px-3 py-1 text-xs font-semibold ${
              vista === "grupo"
                ? "bg-[var(--grass)] text-[#06150d]"
                : "text-[var(--muted)] hover:text-[var(--cream)]"
            }`}
          >
            Por grupo
          </Link>
          <Link
            href="/?vista=fecha"
            className={`px-3 py-1 text-xs font-semibold ${
              vista === "fecha"
                ? "bg-[var(--grass)] text-[#06150d]"
                : "text-[var(--muted)] hover:text-[var(--cream)]"
            }`}
          >
            Por fecha
          </Link>
        </div>
        {navItems.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs hover:border-[var(--grass-dim)] hover:text-[var(--cream)] ${
              s.id === "hoy"
                ? "border-[var(--gold)] text-[var(--gold)]"
                : "border-[var(--line)] text-[var(--muted)]"
            }`}
          >
            {s.title}
          </a>
        ))}
      </nav>

      {vista === "fecha" ? (
        <div className="flex flex-col gap-10">
          {daySections.map((section) => (
            <section key={section.key} id={section.id} className="scroll-mt-28">
              <h2 className="font-display mb-1 text-2xl text-[var(--gold)]">
                {section.title.toUpperCase()}
                {section.id === "hoy" && (
                  <span className="chip chip-gold ml-3 align-middle">⚽ hoy juegan</span>
                )}
              </h2>
              {section.title !== section.subtitle && (
                <p className="mb-4 text-sm capitalize text-[var(--muted)]">{section.subtitle}</p>
              )}
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {section.matches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {[...groupSections, ...koSections].map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-28">
              <h2 className="font-display mb-4 text-2xl text-[var(--gold)]">
                {section.title.toUpperCase()}
              </h2>
              <div className={section.standings ? "grid items-start gap-4 lg:grid-cols-3" : ""}>
                {section.standings && (
                  <div className="lg:sticky lg:top-28">
                    <GroupTable rows={section.standings} teams={teamInfo} />
                  </div>
                )}
                <div
                  className={
                    section.standings
                      ? "grid gap-3 md:grid-cols-2 lg:col-span-2 lg:grid-cols-1 2xl:grid-cols-2"
                      : "grid gap-3 md:grid-cols-2"
                  }
                >
                  {section.matches.map((m) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
