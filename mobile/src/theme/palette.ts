import type { RendererShellState } from '../model/shell-types';

export type Palette = {
  background: string;
  surface: string;
  surfaceSoft: string;
  surfaceHover: string;
  divider: string;
  controlBorder: string;
  text: string;
  textSoft: string;
  accent: string;
  accentSoft: string;
  scrim: string;
};

function nativeThemeColor(value: unknown, fallback: string) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return /^(?:#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|transparent)$/i.test(text) ? text : fallback;
}

export function paletteFor(theme: RendererShellState['theme'], tokens: Record<string, string> = {}): Palette {
  const dark = theme === 'dark';
  const fallback: Palette = dark ? {
    background: '#151922',
    surface: '#1d232e',
    surfaceSoft: '#202733',
    surfaceHover: '#29313d',
    divider: 'rgba(166,181,202,0.04)',
    controlBorder: 'rgba(166,181,202,0.16)',
    text: '#edf2f8',
    textSoft: '#9ca9ba',
    accent: '#4d8dff',
    accentSoft: '#253b61',
    scrim: 'rgba(4, 8, 14, .62)',
  } : {
    background: '#eef4fb',
    surface: '#fbfcfe',
    surfaceSoft: '#f2f6fb',
    surfaceHover: '#e9f0f8',
    divider: 'rgba(102,132,168,0.085)',
    controlBorder: 'rgba(102,132,168,0.22)',
    text: '#1c2a43',
    textSoft: '#6c7b92',
    accent: '#096bfa',
    accentSoft: '#eaf2ff',
    scrim: 'rgba(15, 23, 42, .34)',
  };
  return {
    ...fallback,
    background: nativeThemeColor(tokens.canvas, fallback.background),
    surface: nativeThemeColor(tokens.surface, fallback.surface),
    surfaceSoft: nativeThemeColor(tokens.surfaceSoft, fallback.surfaceSoft),
    surfaceHover: nativeThemeColor(tokens.surfaceHover, fallback.surfaceHover),
    divider: nativeThemeColor(tokens.divider, fallback.divider),
    controlBorder: nativeThemeColor(tokens.controlBorder, fallback.controlBorder),
    text: nativeThemeColor(tokens.text, fallback.text),
    textSoft: nativeThemeColor(tokens.textSoft, fallback.textSoft),
    accent: nativeThemeColor(tokens.accent, fallback.accent),
    accentSoft: nativeThemeColor(tokens.accentSoft, fallback.accentSoft),
  };
}
