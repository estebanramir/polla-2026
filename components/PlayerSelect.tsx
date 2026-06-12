import type { PlayerGroup } from "@/lib/players";

export function PlayerSelect({
  name,
  groups,
  defaultValue,
  disabled,
}: {
  name: string;
  groups: PlayerGroup[];
  defaultValue: string;
  disabled?: boolean;
}) {
  return (
    <select name={name} defaultValue={defaultValue} disabled={disabled} className="input">
      <option value="">— Elegir jugador —</option>
      {groups.map((g) => (
        <optgroup key={g.team} label={g.team}>
          {g.players.map((p) => (
            <option key={`${g.team}-${p}`} value={p}>
              {p}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
