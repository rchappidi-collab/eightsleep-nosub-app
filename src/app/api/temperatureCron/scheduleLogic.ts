/**
 * Given a list of schedule entries and the current time, return the
 * temperature that should be active (the most recent schedule entry before
 * now). Handles midnight crossing and ignores stale schedules that are
 * more than 12 hours old.
 */
export function getTargetTemperatureFromSchedules(
  schedules: Array<{ time: string; temperature: number }>,
  now: Date,
): { targetLevel: number | null; stage: string } {
  if (schedules.length === 0) {
    return { targetLevel: null, stage: "no-schedule" };
  }

  const sorted = [...schedules].sort((a, b) => a.time.localeCompare(b.time));

  let activeSchedule: { time: string; temperature: number } | null = null;
  let smallestDiff = Infinity;
  const MAX_LOOKBACK_MS = 12 * 60 * 60 * 1000; // 12 hours

  for (const schedule of sorted) {
    const [hours, minutes] = schedule.time.split(':').map(Number);

    // Build a candidate time on the same calendar day as `now`
    const candidate = new Date(now);
    candidate.setHours(hours!, minutes!, 0, 0);

    // If the candidate is in the future relative to `now`, shift it back
    // one day so it represents "yesterday's" occurrence of that time.
    if (candidate > now) {
      candidate.setDate(candidate.getDate() - 1);
    }

    const diff = now.getTime() - candidate.getTime();

    // Only consider candidates within the lookback window.
    if (diff >= 0 && diff <= MAX_LOOKBACK_MS && diff <= smallestDiff) {
      smallestDiff = diff;
      activeSchedule = schedule;
    }
  }

  if (activeSchedule) {
    return {
      targetLevel: activeSchedule.temperature,
      stage: `schedule-${activeSchedule.time}`,
    };
  }

  return { targetLevel: null, stage: "before-first-schedule" };
}