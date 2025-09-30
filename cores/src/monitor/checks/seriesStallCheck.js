/**
 * Emits an alert when a specific series (e.g., voltage, co2) for a cell
 * has no new data for ≥ stallMsBySeries[series]. Emits RESUMED when it recovers.
 */
export function createSeriesStallCheck({
  stallMsBySeries = {
    co2:         10 * 60 * 1000,
    voltage:     10 * 60 * 1000,
    water:       10 * 60 * 1000,
    temperature: 10 * 60 * 1000,
    humidity:    10 * 60 * 1000,
  },
  cooldownMs = 30 * 60 * 1000, // re-alert spacing while still stalled (for email/webhook)
} = {}) {
  const stalled = new Set();              // keys like "1301|voltage"
  const lastAlertAt = new Map();          // key -> ms

  const k = (cellId, series) => `${cellId}|${series}`;

  function shouldCooldown(key, nowMs) {
    const last = lastAlertAt.get(key);
    return !last || (nowMs - last) >= cooldownMs;
  }

  return {
    name: "seriesStallCheck",
    reset() { stalled.clear(); lastAlertAt.clear(); },

    onSnapshot(snapshot, emit) {
      const { lastBySeries = {}, now } = snapshot;
      const nowMs = now.getTime();

      for (const [cellIdStr, perSeries] of Object.entries(lastBySeries)) {
        const cellId = Number(cellIdStr);
        for (const [series, iso] of Object.entries(perSeries || {})) {
          const stallMs = stallMsBySeries[series];
          if (!stallMs) continue; // unknown series or disabled

          // If we’ve never seen this series for the cell, skip until first timestamp arrives
          if (!iso) {
            // you could choose to treat "missing entirely" as stalled; here we skip
            continue;
          }

          const lastMs = Date.parse(iso);
          if (!Number.isFinite(lastMs)) continue;

          const age = nowMs - lastMs;
          const isStalled = age >= stallMs;
          const key = k(cellId, series);
          const wasStalled = stalled.has(key);

          if (isStalled) {
            if (!wasStalled) {
              stalled.add(key);
              emit({
                type: "DATA_STALL_SERIES",
                severity: "warn",
                message: `No ${series} data for ≥ ${Math.floor(stallMs/60000)} min (cell ${cellId})`,
                meta: { cellId, series, last: iso, stallMs, ageMs: age },
              });
              lastAlertAt.set(key, nowMs);
            } else if (shouldCooldown(key, nowMs)) {
              emit({
                type: "DATA_STALL_SERIES",
                severity: "warn",
                message: `Still no ${series} data for ≥ ${Math.floor(stallMs/60000)} min (cell ${cellId})`,
                meta: { cellId, series, last: iso, stallMs, ageMs: age, reminder: true },
              });
              lastAlertAt.set(key, nowMs);
            }
          } else if (wasStalled) {
            stalled.delete(key);
            emit({
              type: "DATA_RESUMED_SERIES",
              severity: "info",
              message: `${series} data resumed (cell ${cellId})`,
              meta: { cellId, series, last: iso, stallMs },
            });
          }
        }
      }
    },
  };
}
