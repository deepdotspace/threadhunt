/**
 * Per-topic scheduling math (pure). Spread scansPerDay evenly across 24h; if a
 * preferred timeOfDay (HH:MM) is set, anchor the daily slots to it. Returns the
 * epoch ms of the next due run strictly after `now`.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** Parse "HH:MM" to minutes past midnight, or null if missing/invalid. */
function parseTimeOfDay(timeOfDay: string | null): number | null {
  if (!timeOfDay) return null
  const m = timeOfDay.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

export function computeNextDueAt(
  now: number,
  scansPerDay: number,
  timeOfDay: string | null,
): number {
  const count = Math.max(1, Math.floor(scansPerDay))
  const slotMs = DAY_MS / count
  const anchorMin = parseTimeOfDay(timeOfDay)

  // Without an anchor, the next slot is one even interval from now.
  if (anchorMin === null) return now + slotMs

  // Anchored: candidate slot times are anchor + k*slot within the day window;
  // walk forward from the anchor of `now`'s day until strictly after `now`.
  const dayStart = now - (now % DAY_MS)
  const anchorMs = anchorMin * 60 * 1000
  let due = dayStart + anchorMs
  while (due <= now) due += slotMs
  return due
}
