export const STAGE_LABELS: Record<string, string> = {
  GROUP: "Fase de grupos",
  R32: "Dieciseisavos",
  R16: "Octavos",
  QF: "Cuartos",
  SF: "Semifinal",
  THIRD: "Tercer puesto",
  FINAL: "Final",
};

/** "1A" → "1° Grupo A", "3:ABCDF" → "3° A/B/C/D/F", "W74" → "Gana P74" */
export function slotLabel(slot: string | null | undefined) {
  if (!slot) return "Por definir";
  if (slot.startsWith("3:")) return `3° ${slot.slice(2).split("").join("/")}`;
  if (/^[12][A-L]$/.test(slot)) return `${slot[0]}° Grupo ${slot[1]}`;
  if (slot.startsWith("W")) return `Gana P${slot.slice(1)}`;
  if (slot.startsWith("L")) return `Pierde P${slot.slice(1)}`;
  return slot;
}
