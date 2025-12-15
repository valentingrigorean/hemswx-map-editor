import type { LayerConfig } from '../../../lib/types';
import type { PreviewLayerEntry } from './types';

export function isAuthRelatedError(errorMessage: string): boolean {
  const lowerError = errorMessage.toLowerCase();
  return lowerError.includes('403') ||
    lowerError.includes('not authorized') ||
    lowerError.includes('access denied') ||
    lowerError.includes('authentication') ||
    lowerError.includes('unauthorized') ||
    lowerError.includes('sign in') ||
    lowerError.includes('token required');
}

export function hasPortalItemLayer(configs: LayerConfig[]): boolean {
  return configs.some(c => c.type === 'portalItem');
}

function normalizeOptionsForIdentity(
  options: Record<string, any> | undefined
): Record<string, any> | undefined {
  if (!options) return undefined;

  const normalized: Record<string, any> = {};
  Object.entries(options)
    .filter(([key]) => key !== 'opacity')
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => {
      normalized[key] = value;
    });

  return normalized;
}

export function getBaseLayerIdentity(config: LayerConfig): string {
  const supportedDimensions = config.supportedDimensions
    ? [...config.supportedDimensions].sort()
    : undefined;

  return JSON.stringify({
    type: config.type,
    sourceKind: config.sourceKind ?? null,
    source: config.source,
    refreshInterval: config.refreshInterval ?? null,
    supportedDimensions: supportedDimensions ?? null,
    options: normalizeOptionsForIdentity(config.options) ?? null,
    sceneProperties: config.sceneProperties ?? null
  });
}

export function safeDestroyLayer(layer: __esri.Layer): void {
  const destroy = (layer as any)?.destroy;
  if (typeof destroy === 'function') {
    destroy.call(layer);
  }
}

export function buildPreviewLayerEntries(configs: LayerConfig[]): PreviewLayerEntry[] {
  const occurrences = new Map<string, number>();
  const entries: PreviewLayerEntry[] = configs.map((config, originalIndex) => {
    const baseKey = getBaseLayerIdentity(config);
    const occurrence = (occurrences.get(baseKey) ?? 0) + 1;
    occurrences.set(baseKey, occurrence);

    return {
      key: occurrence === 1 ? baseKey : `${baseKey}::dup${occurrence}`,
      config,
      opacity: config.options?.opacity ?? 1,
      zIndex: config.zIndex ?? 0,
      originalIndex
    };
  });

  entries.sort((a, b) => (a.zIndex - b.zIndex) || (a.originalIndex - b.originalIndex));
  return entries;
}
