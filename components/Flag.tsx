export function Flag({
  code,
  name,
  size = 40,
}: {
  code?: string | null;
  name?: string;
  size?: number;
}) {
  if (!code) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-[4px] border border-dashed border-[var(--line)] text-[10px] text-[var(--muted)]"
        style={{ width: size, height: size * 0.75 }}
      >
        ?
      </span>
    );
  }
  return (
    // flagcdn sirve banderas por código ISO; w80 se ve nítido en retina
    <img
      src={`https://flagcdn.com/w80/${code}.png`}
      alt={name ?? code}
      width={size}
      height={size * 0.75}
      className="rounded-[4px] object-cover shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
      style={{ width: size, height: size * 0.75 }}
      loading="lazy"
    />
  );
}
