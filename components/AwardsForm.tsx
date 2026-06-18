"use client";

import { useState, useTransition } from "react";
import { saveAwards } from "@/app/actions/predictions";
import { PlayerCombobox } from "./PlayerCombobox";
import { TeamCombobox } from "./TeamCombobox";
import type { PlayerGroup } from "@/lib/players";
import type { TeamOption } from "@/lib/teams";
import { POINTS } from "@/lib/scoring";

export function AwardsForm({
  locked,
  topScorer,
  bestKeeper,
  champion,
  runnerUp,
  actualScorer,
  actualKeeper,
  actualChampion,
  actualRunnerUp,
  scorers,
  keepers,
  teams,
}: {
  locked: boolean;
  topScorer: string;
  bestKeeper: string;
  champion: string;
  runnerUp: string;
  actualScorer: string;
  actualKeeper: string;
  actualChampion: string;
  actualRunnerUp: string;
  scorers: PlayerGroup[];
  keepers: PlayerGroup[];
  teams: TeamOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? id;

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await saveAwards(formData);
      if (res?.error) setError(res.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <form action={submit} className="card flex flex-col gap-5 p-6">
      <div>
        <label className="mb-1.5 block text-sm font-semibold">
          🏆 Campeón del Mundial{" "}
          <span className="text-[var(--muted)]">(+{POINTS.champion} pts)</span>
        </label>
        <TeamCombobox name="champion" teams={teams} defaultValue={champion} disabled={locked} />
        {actualChampion && (
          <p className="mt-1 text-xs text-[var(--gold)]">
            Campeón oficial: {teamName(actualChampion)}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold">
          🥈 Subcampeón{" "}
          <span className="text-[var(--muted)]">(+{POINTS.runnerUp} pts)</span>
        </label>
        <TeamCombobox name="runnerUp" teams={teams} defaultValue={runnerUp} disabled={locked} />
        {actualRunnerUp && (
          <p className="mt-1 text-xs text-[var(--gold)]">
            Subcampeón oficial: {teamName(actualRunnerUp)}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold">
          ⚽ Goleador del Mundial{" "}
          <span className="text-[var(--muted)]">(+{POINTS.topScorer} pts)</span>
        </label>
        <PlayerCombobox
          name="topScorer"
          groups={scorers}
          defaultValue={topScorer}
          disabled={locked}
        />
        {actualScorer && (
          <p className="mt-1 text-xs text-[var(--gold)]">
            Goleador oficial: {actualScorer}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold">
          🧤 Mejor arquero{" "}
          <span className="text-[var(--muted)]">(+{POINTS.bestKeeper} pts)</span>
        </label>
        <PlayerCombobox
          name="bestKeeper"
          groups={keepers}
          defaultValue={bestKeeper}
          disabled={locked}
        />
        {actualKeeper && (
          <p className="mt-1 text-xs text-[var(--gold)]">
            Arquero oficial: {actualKeeper}
          </p>
        )}
      </div>

      {locked ? (
        <p className="text-sm text-[var(--danger)]">
          Las apuestas de premios están cerradas.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <button className="btn" disabled={pending}>
            {pending ? "Guardando…" : "Guardar premios"}
          </button>
          {saved && <span className="text-sm text-[var(--grass)]">Guardado ✓</span>}
          {error && <span className="text-sm text-[var(--danger)]">{error}</span>}
        </div>
      )}
    </form>
  );
}
