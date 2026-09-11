(() => {
  'use strict';
  const runtimeRoot = typeof globalThis !== 'undefined' ? globalThis : window;
  if (runtimeRoot.DKDSDOMMutationHub) {
    if (typeof module !== 'undefined' && module.exports) module.exports = runtimeRoot.DKDSDOMMutationHub;
    return;
  }

  const VERSION = '1.1.0';
  const doc = typeof document !== 'undefined' ? document : null;
  const defer = typeof queueMicrotask === 'function' ? queueMicrotask : fn => Promise.resolve().then(fn);
  const subscriptions = new Map();
  let observer = null;
  let observerActive = false;
  let started = false;
  const stats = {
    reconnects: 0,
    batches: 0,
    records: 0,
    dispatched: 0,
    subscribers: 0,
    filterChecks: 0,
    callbackBatches: 0,
    maxBatchRecords: 0,
    totalDispatchMs: 0,
    lastDispatchMs: 0,
    maxDispatchMs: 0
  };
  const now = () => typeof runtimeRoot.performance?.now === 'function' ? runtimeRoot.performance.now() : Date.now();

  const isNode = value => !!value && typeof value === 'object' && typeof value.nodeType === 'number';
  const documentRoot = () => doc?.documentElement || doc?.body || null;
  const normalizeRoot = root => {
    if (!root || root === doc) return documentRoot();
    return isNode(root) ? root : documentRoot();
  };
  const normalizeFilter = value => [...new Set((Array.isArray(value) ? value : []).map(String).filter(Boolean))].sort();

  function normalizeOptions(options = {}) {
    return Object.freeze({
      childList: options.childList !== false,
      subtree: options.subtree !== false,
      attributes: options.attributes === true,
      characterData: options.characterData === true,
      attributeOldValue: options.attributeOldValue === true,
      characterDataOldValue: options.characterDataOldValue === true,
      attributeFilter: normalizeFilter(options.attributeFilter)
    });
  }

  function rootContains(root, node) {
    if (!root || !node) return false;
    if (root === node) return true;
    return typeof root.contains === 'function' ? root.contains(node) : false;
  }

  function matchesSubscription(record, sub) {
    if (!record || !sub) return false;
    if (!rootContains(sub.root, record.target)) return false;
    if (record.type === 'childList') return sub.options.childList;
    if (record.type === 'attributes') {
      if (!sub.options.attributes) return false;
      const filter = sub.options.attributeFilter;
      return !filter.length || filter.includes(String(record.attributeName || ''));
    }
    if (record.type === 'characterData') return sub.options.characterData;
    return false;
  }

  function mergedObserverOptions() {
    let childList = false;
    let attributes = false;
    let characterData = false;
    let attributeOldValue = false;
    let characterDataOldValue = false;
    let attributeFilterOpen = false;
    const attributeFilter = new Set();

    for (const sub of subscriptions.values()) {
      const options = sub.options;
      childList ||= options.childList;
      attributes ||= options.attributes;
      characterData ||= options.characterData;
      attributeOldValue ||= options.attributeOldValue;
      characterDataOldValue ||= options.characterDataOldValue;
      if (options.attributes) {
        if (!options.attributeFilter.length) attributeFilterOpen = true;
        else for (const name of options.attributeFilter) attributeFilter.add(name);
      }
    }

    const merged = { childList, subtree: true, attributes, characterData };
    if (attributes && attributeOldValue) merged.attributeOldValue = true;
    if (characterData && characterDataOldValue) merged.characterDataOldValue = true;
    if (attributes && !attributeFilterOpen && attributeFilter.size) merged.attributeFilter = [...attributeFilter].sort();
    return merged;
  }

  function dispatch(records) {
    const startedAt = now();
    stats.batches++;
    stats.records += records.length;
    stats.maxBatchRecords = Math.max(stats.maxBatchRecords, records.length);
    for (const sub of subscriptions.values()) {
      const filtered = [];
      for (const record of records) {
        stats.filterChecks++;
        if (matchesSubscription(record, sub)) filtered.push(record);
      }
      if (!filtered.length) continue;
      stats.dispatched += filtered.length;
      stats.callbackBatches++;
      try { sub.callback(filtered); }
      catch (error) { defer(() => { throw error; }); }
    }
    const elapsed = Math.max(0, now() - startedAt);
    stats.lastDispatchMs = elapsed;
    stats.totalDispatchMs += elapsed;
    stats.maxDispatchMs = Math.max(stats.maxDispatchMs, elapsed);
  }

  function reconnect() {
    observer?.disconnect?.();
    observerActive = false;
    stats.reconnects++;
    stats.subscribers = subscriptions.size;
    if (!subscriptions.size || typeof MutationObserver !== 'function') return;
    const root = documentRoot();
    if (!root) return;
    const options = mergedObserverOptions();
    if (!options.childList && !options.attributes && !options.characterData) return;
    if (!observer) observer = new MutationObserver(dispatch);
    observer.observe(root, options);
    observerActive = true;
  }

  function start() {
    if (started) return;
    started = true;
    reconnect();
  }

  function subscribe(id, callback, options = {}) {
    const key = String(id || '').trim();
    if (!key) throw new Error('DOM Mutation Hub subscription id is required.');
    if (typeof callback !== 'function') throw new Error(`DOM Mutation Hub callback is required: ${key}`);
    if (subscriptions.has(key)) throw new Error(`DOM Mutation Hub subscription already exists: ${key}`);
    subscriptions.set(key, Object.freeze({
      id: key,
      callback,
      root: normalizeRoot(options.root),
      options: normalizeOptions(options)
    }));
    if (started) reconnect();
    return () => {
      if (!subscriptions.delete(key)) return false;
      if (started) reconnect();
      return true;
    };
  }

  function snapshot() {
    return Object.freeze({
      version: VERSION,
      started,
      observerActive,
      ...stats,
      averageDispatchMs: stats.batches ? stats.totalDispatchMs / stats.batches : 0,
      subscribers: subscriptions.size,
      ids: Object.freeze([...subscriptions.keys()].sort()),
      observerOptions: Object.freeze(mergedObserverOptions())
    });
  }

  const api = Object.freeze({ VERSION, subscribe, start, snapshot });
  runtimeRoot.DKDSDOMMutationHub = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (doc?.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true });
  else if (doc) start();
})();
