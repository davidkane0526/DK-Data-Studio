import type { RendererShellState, ShellSurface } from './shell-types';

export const surfaceRequestId = (surface: ShellSurface) => surface.surfaceId || surface.id;
export const navigableSurfaces = (shell: RendererShellState) => (shell.surfaces || []).filter(surface => surface.presentation?.navigation !== 'primary' && surface.presentation?.region !== 'main' && surface.kind !== 'primary').slice().sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || a.label.localeCompare(b.label));
export const dataControlSurfaces = (shell: RendererShellState) => (shell.surfaces || []).filter(surface => surface.role === 'data-control').slice().sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || surfaceRequestId(a).localeCompare(surfaceRequestId(b)));
export const canonicalDataControlSurface = (shell: RendererShellState) => dataControlSurfaces(shell)[0] || null;
/** @deprecated internal alias retained for older Mobile tests/extensions. */
export const parameterSurfaces = dataControlSurfaces;
/** @deprecated internal alias retained for older Mobile tests/extensions. */
export const canonicalParameterSurface = canonicalDataControlSurface;
export const primarySurface = (shell: RendererShellState) => (shell.surfaces || []).find(surface => surface.kind === 'primary' || surface.presentation?.navigation === 'primary' || surface.presentation?.region === 'main') || null;
export const surfaceDetail = (surface: ShellSurface) => {
  const region = String(surface.presentation?.region || '');
  if (region === 'drawer') return surface.active ? '参数抽屉已打开' : '从左侧打开参数抽屉';
  if (region === 'sheet') return surface.active ? '当前面板已打开' : '从底部打开面板';
  if (region === 'companion-right') return surface.active ? '右侧检查器已显示' : '与主图并排显示';
  if (region === 'companion-bottom') return surface.active ? '下方科学面板已显示' : '与主图组合显示';
  if (region === 'route') return surface.active ? '当前页面' : '打开工作区页面';
  return surface.active ? '当前显示' : '在当前工作区打开';
};
