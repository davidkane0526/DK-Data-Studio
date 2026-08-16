(() => {
  const listeners = new Set();

  function computeProfile() {
    const w = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    const h = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    const coarse = !!window.matchMedia?.('(pointer: coarse)').matches;
    const hover = !!window.matchMedia?.('(hover: hover)').matches;
    const standalone = !!window.matchMedia?.('(display-mode: standalone)').matches;
    const webClient = !!window.__GRS_WEB_CLIENT__;
    const android = /\bAndroid\b/i.test(navigator.userAgent || '');

    let size = 'large';
    if (w < 720) size = 'compact';
    else if (w < 1180) size = 'medium';

    let orientation = 'landscape';
    if (h > w) orientation = 'portrait';

    return {
      runtime: webClient ? 'web' : 'electron',
      android,
      standalone,
      width: w,
      height: h,
      size,
      orientation,
      pointer: coarse ? 'coarse' : 'fine',
      hover,
      touch: coarse || (navigator.maxTouchPoints || 0) > 0,
      interaction: {
        targetMinPx: coarse ? 44 : 30,
        curveHitPx: coarse ? 24 : 14,
        nearestCurvePx: coarse ? 28 : 18,
        peakHitRadiusPx: coarse ? 16 : 10,
        dragThresholdPx: coarse ? 10 : 7,
        longPressMs: 520
      }
    };
  }

  let profile = computeProfile();

  function applyClasses(next) {
    const root = document.documentElement;
    for (const c of [
      'grs-size-compact','grs-size-medium','grs-size-large',
      'grs-pointer-coarse','grs-pointer-fine',
      'grs-orientation-portrait','grs-orientation-landscape',
      'grs-runtime-web','grs-runtime-electron',
      'grs-platform-android'
    ]) root.classList.remove(c);

    root.classList.add(`grs-size-${next.size}`);
    root.classList.add(`grs-pointer-${next.pointer}`);
    root.classList.add(`grs-orientation-${next.orientation}`);
    root.classList.add(`grs-runtime-${next.runtime}`);
    if (next.android) root.classList.add('grs-platform-android');

    root.style.setProperty('--grs-touch-target', `${next.interaction.targetMinPx}px`);
    root.style.setProperty('--grs-curve-hit', `${next.interaction.curveHitPx}px`);
    root.style.setProperty('--grs-peak-hit-radius', `${next.interaction.peakHitRadiusPx}px`);
  }

  function refresh() {
    const next = computeProfile();
    const changed = JSON.stringify(next) !== JSON.stringify(profile);
    profile = next;
    applyClasses(profile);
    if (changed) {
      for (const fn of listeners) {
        try { fn(profile); } catch (err) { console.error('[GRS platform listener]', err); }
      }
      window.dispatchEvent(new CustomEvent('grs:platform-change', { detail: profile }));
    }
    return profile;
  }

  window.GRSPlatform = {
    get profile() { return profile; },
    refresh,
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    isCompact: () => profile.size === 'compact',
    isTouch: () => profile.touch
  };

  applyClasses(profile);
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(refresh, 80), { passive: true });
})();
