// src/monitor/CheckRunner.js
/**
 * Orchestrates a set of "checks". Each check can implement:
 *  - onSnapshot(snapshot, emit)   : called whenever you push a new snapshot
 *  - onTick(now, emit)            : called periodically (setInterval)
 *  - reset()                      : optional, called when runner is reset
 *
 * `emit(event)` lets a check publish events to all notifiers.
 *
 * Snapshot shape (you control it when you call runner.pushSnapshot):
 * {
 *   lastByCell: { [cellId: number]: ISOString },
 *   now: Date,
 * }
 */

export class CheckRunner {
  constructor({ checks = [], notifiers = [] } = {}) {
    this.checks = checks;
    this.notifiers = notifiers;
    this._timer = null;
  }

  _emit = (event) => {
    // event: { type, severity, message, meta }
    for (const n of this.notifiers) {
      try { n.handle?.(event); } catch (e) { /* eslint-disable no-console */ console.error(e); }
    }
  };

  setNotifiers(notifiers) {
    this.notifiers = notifiers || [];
  }

  register(check) { this.checks.push(check); }

  pushSnapshot(snapshot) {
    for (const c of this.checks) {
      try { c.onSnapshot?.(snapshot, this._emit); } catch (e) { console.error(e); }
    }
  }

  startTick(ms = 60_000) {
    this.stopTick();
    this._timer = setInterval(() => {
      const now = new Date();
      for (const c of this.checks) {
        try { c.onTick?.(now, this._emit); } catch (e) { console.error(e); }
      }
    }, ms);
  }

  stopTick() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  reset() {
    for (const c of this.checks) {
      try { c.reset?.(); } catch (e) { console.error(e); }
    }
  }
}
