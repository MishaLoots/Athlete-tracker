export function formatSleep(val: number | null | undefined): string {
  if (val == null) return '—'
  const h = Math.floor(val)
  const m = Math.round((val - h) * 60)
  return `${h}:${String(m).padStart(2, '0')}`
}
