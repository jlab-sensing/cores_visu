// src/monitor/checks/latestZeroCheck.js
export function createLatestZeroCheck({
  epsilon = 0,
  dedupeUntilChange = true,
} = {}) {
  const zeroState = new Map(); // cellId -> 1 while at zero

  return {
    name: "latestZeroCheck",
    reset() { zeroState.clear(); },

    onSnapshot(snapshot, emit) {
      const { latestValues = {}, now } = snapshot;

      for (const [cellIdStr, value] of Object.entries(latestValues)) {
        const cellId = Number(cellIdStr);
        const isZero = Math.abs(value) <= epsilon;
        const wasZero = zeroState.get(cellId) === 1;

        if (isZero && !wasZero) {
          zeroState.set(cellId, 1);
          // eslint-disable-next-line no-console
          console.warn(`[LATEST_ZERO] Cell ${cellId} latest value = 0 at ${now.toISOString()}`);
          emit({
            type: "LATEST_ZERO",
            severity: "warn",
            message: `Cell ${cellId} latest value = 0`,
            meta: { cellId, value, at: now.toISOString() },
          });
        } else if (!isZero && wasZero) {
          zeroState.delete(cellId);
          emit({
            type: "LATEST_ZERO_RESOLVED",
            severity: "info",
            message: `Zero resolved (cell ${cellId})`,
            meta: { cellId, value, at: now.toISOString() },
          });
        }
      }
    },
  };
}
