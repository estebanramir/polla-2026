"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { savePrediction } from "@/app/actions/predictions";
import { Flag } from "./Flag";
import { LocalTime } from "./LocalTime";

type TeamRef = { id: string; name: string; flagCode: string | null } | null;

export type MatchView = {
  id: number;
  kickoff: string;
  venue: string;
  stageLabel: string;
  group: string | null;
  home: TeamRef;
  away: TeamRef;
  homeSlotLabel: string;
  awaySlotLabel: string;
  homeScore: number | null;
  awayScore: number | null;
  locked: boolean;
  prediction: { homeScore: number; awayScore: number } | null;
  points: number | null; // puntos ganados, null si no hay resultado
};

function TeamSide({ team, slotLabel }: { team: TeamRef; slotLabel: string }) {
  const inner = (
    <>
      <Flag code={team?.flagCode} name={team?.name} size={40} />
      <span
        className={`w-full break-words text-xs font-semibold leading-tight ${
          team ? "" : "italic text-[var(--muted)]"
        }`}
      >
        {team?.name ?? slotLabel}
      </span>
    </>
  );

  if (team) {
    return (
      <Link
        href={`/equipo/${team.id}`}
        className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-lg py-1 text-center transition-colors hover:bg-[var(--bg-card-hover)]"
        title={`Ver partidos de ${team.name}`}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 py-1 text-center">
      {inner}
    </div>
  );
}

export function MatchCard({ match }: { match: MatchView }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [home, setHome] = useState(match.prediction?.homeScore?.toString() ?? "");
  const [away, setAway] = useState(match.prediction?.awayScore?.toString() ?? "");

  const dirty =
    home !== (match.prediction?.homeScore?.toString() ?? "") ||
    away !== (match.prediction?.awayScore?.toString() ?? "");

  function submit() {
    if (home === "" || away === "") return;
    const fd = new FormData();
    fd.set("matchId", String(match.id));
    fd.set("homeScore", home);
    fd.set("awayScore", away);
    setError(null);
    startTransition(async () => {
      const res = await savePrediction(fd);
      if (res?.error) setError(res.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  const hasResult = match.homeScore != null && match.awayScore != null;

  return (
    <div className="card card-hover rise p-4 transition-colors">
      <div className="mb-3 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>
          P{match.id} ·{" "}
          <span className="text-[var(--gold)]">
            {match.group ? `Grupo ${match.group}` : match.stageLabel}
          </span>{" "}
          · <LocalTime iso={match.kickoff} />
        </span>
        {match.locked ? (
          hasResult && match.points != null ? (
            <span className={`chip ${match.points > 0 ? "chip-gold" : ""}`}>
              {match.points > 0 ? `+${match.points} pts` : "0 pts"}
            </span>
          ) : (
            <span className="chip chip-locked">Cerrado</span>
          )
        ) : (
          <span className="chip chip-grass">Abierto</span>
        )}
      </div>

      <div className="flex items-start gap-3">
        <TeamSide team={match.home} slotLabel={match.homeSlotLabel} />

        {match.locked ? (
          <div className="flex flex-col items-center gap-1 px-1 pt-2">
            <div className="font-display text-2xl tabular-nums">
              {hasResult ? `${match.homeScore} - ${match.awayScore}` : "vs"}
            </div>
            {match.prediction && (
              <div className="text-[11px] text-[var(--muted)]">
                Tu pron.: {match.prediction.homeScore}-{match.prediction.awayScore}
              </div>
            )}
            {!match.prediction && (
              <div className="text-[11px] text-[var(--muted)]">Sin pronóstico</div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-1 pt-3">
            <input
              type="number"
              min={0}
              max={99}
              inputMode="numeric"
              className="score-input"
              value={home}
              onChange={(e) => setHome(e.target.value)}
              aria-label="Goles local"
            />
            <span className="text-[var(--muted)]">–</span>
            <input
              type="number"
              min={0}
              max={99}
              inputMode="numeric"
              className="score-input"
              value={away}
              onChange={(e) => setAway(e.target.value)}
              aria-label="Goles visitante"
            />
          </div>
        )}

        <TeamSide team={match.away} slotLabel={match.awaySlotLabel} />
      </div>

      {!match.locked && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            className="btn !py-1.5 !px-4 !text-xs"
            onClick={submit}
            disabled={pending || home === "" || away === "" || (!dirty && !error)}
          >
            {pending ? "Guardando…" : match.prediction ? "Actualizar" : "Guardar"}
          </button>
          {saved && <span className="text-xs text-[var(--grass)]">Guardado ✓</span>}
          {error && <span className="text-xs text-[var(--danger)]">{error}</span>}
        </div>
      )}
    </div>
  );
}
