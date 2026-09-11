(() => {
  'use strict';
  const root = typeof globalThis !== 'undefined' ? globalThis : window;
  if (root.DKDSFrameScheduler) {
    if (typeof module !== 'undefined' && module.exports) module.exports = root.DKDSFrameScheduler;
    return;
  }

  const VERSION = '1.1.0';
  const PRIORITY = Object.freeze({
    SEMANTIC: 10,
    MATERIAL: 20,
    APPEARANCE: 30,
    LAYOUT: 40,
    GENERAL: 50
  });
  const tasks = new Map();
  let frameToken = 0;
  let frameIndex = 0;
  let sequence = 0;
  const stats = {
    frameRequests: 0,
    frames: 0,
    scheduled: 0,
    coalesced: 0,
    cancelled: 0,
    callbacks: 0,
    errors: 0,
    maxPending: 0,
    totalFlushMs: 0,
    lastFlushMs: 0,
    maxFlushMs: 0,
    callbacksByPriority: Object.create(null)
  };
  const now = () => typeof root.performance?.now === 'function' ? root.performance.now() : Date.now();

  const requestFrame = typeof root.requestAnimationFrame === 'function'
    ? callback => root.requestAnimationFrame(callback)
    : callback => root.setTimeout(() => callback(Date.now()), 16);
  const cancelFrame = typeof root.cancelAnimationFrame === 'function'
    ? token => root.cancelAnimationFrame(token)
    : token => root.clearTimeout(token);

  function ensureFrame() {
    if (frameToken || !tasks.size) return;
    stats.frameRequests++;
    frameToken = requestFrame(flush);
  }

  function flush(timestamp) {
    const started = now();
    frameToken = 0;
    frameIndex++;
    stats.frames++;
    if (tasks.size) {
      const due = [];
      for (const [key, task] of tasks) {
        if (task.dueFrame > frameIndex) continue;
        tasks.delete(key);
        due.push(task);
      }
      due.sort((a, b) => a.priority - b.priority || a.sequence - b.sequence);
      for (const task of due) {
        stats.callbacks++;
        stats.callbacksByPriority[task.priority] = (stats.callbacksByPriority[task.priority] || 0) + 1;
        try { task.callback(timestamp); }
        catch (error) {
          stats.errors++;
          (root.queueMicrotask || (fn => root.setTimeout(fn, 0)))(() => { throw error; });
        }
      }
      ensureFrame();
    }
    const elapsed = Math.max(0, now() - started);
    stats.lastFlushMs = elapsed;
    stats.totalFlushMs += elapsed;
    stats.maxFlushMs = Math.max(stats.maxFlushMs, elapsed);
  }

  function schedule(id, callback, options = {}) {
    const key = String(id || '').trim();
    if (!key) throw new Error('Frame Scheduler task id is required.');
    if (typeof callback !== 'function') throw new Error(`Frame Scheduler callback is required: ${key}`);
    const priority = Number.isFinite(Number(options.priority)) ? Number(options.priority) : PRIORITY.GENERAL;
    const delayFrames = Math.max(1, Number.parseInt(options.delayFrames, 10) || 1);
    const existing = tasks.get(key);
    if (existing) stats.coalesced++;
    else stats.scheduled++;
    tasks.set(key, {
      id: key,
      callback,
      priority,
      sequence: existing?.sequence ?? ++sequence,
      dueFrame: frameIndex + delayFrames
    });
    stats.maxPending = Math.max(stats.maxPending, tasks.size);
    ensureFrame();
    return () => cancel(key);
  }

  function cancel(id) {
    const key = String(id || '').trim();
    if (!key || !tasks.delete(key)) return false;
    stats.cancelled++;
    if (!tasks.size && frameToken) {
      try { cancelFrame(frameToken); } catch {}
      frameToken = 0;
    }
    return true;
  }

  function has(id) {
    return tasks.has(String(id || '').trim());
  }

  function snapshot() {
    return Object.freeze({
      version: VERSION,
      frameIndex,
      framePending: !!frameToken,
      pending: tasks.size,
      pendingIds: Object.freeze([...tasks.keys()].sort()),
      ...stats,
      averageFlushMs: stats.frames ? stats.totalFlushMs / stats.frames : 0,
      callbacksByPriority: Object.freeze({ ...stats.callbacksByPriority })
    });
  }

  const api = Object.freeze({ VERSION, PRIORITY, schedule, cancel, has, snapshot });
  root.DKDSFrameScheduler = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
