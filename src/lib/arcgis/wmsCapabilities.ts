import type { LayerConfig } from '../types';

export interface WMSTimeCapability {
  layerName: string;
  hasTime: boolean;
  timeExtent?: {
    start: string;
    end: string;
  };
}

export interface WMSCapabilitiesResult {
  success: boolean;
  error?: string;
  layers: WMSTimeCapability[];
}

const capabilitiesCache = new Map<string, WMSCapabilitiesResult>();

export async function fetchWMSCapabilities(wmsUrl: string): Promise<Document | null> {
  if (!wmsUrl) return null;

  try {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    let fetchUrl: string;
    if (isLocalhost) {
      fetchUrl = `/wms-proxy?SERVICE=WMS&REQUEST=GetCapabilities&target=${encodeURIComponent(wmsUrl)}`;
    } else {
      const url = new URL(wmsUrl);
      url.searchParams.set('SERVICE', 'WMS');
      url.searchParams.set('REQUEST', 'GetCapabilities');
      fetchUrl = url.toString();
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) return null;

    const text = await response.text();
    const parser = new DOMParser();
    return parser.parseFromString(text, 'text/xml');
  } catch (error) {
    console.warn('Failed to fetch WMS capabilities for:', wmsUrl, error);
    return null;
  }
}

export function parseTimeCapabilities(capabilitiesDoc: Document, layerNames?: string[]): WMSTimeCapability[] {
  const results: WMSTimeCapability[] = [];

  const layers = capabilitiesDoc.querySelectorAll('Layer');

  layers.forEach(layer => {
    const nameElement = layer.querySelector(':scope > Name');
    if (!nameElement) return;

    const name = nameElement.textContent || '';

    if (layerNames && layerNames.length > 0 && !layerNames.includes(name)) {
      return;
    }

    let hasTime = false;
    let timeExtent: { start: string; end: string } | undefined;

    const dimensions = layer.querySelectorAll(':scope > Dimension, :scope > Extent');
    dimensions.forEach(dim => {
      const dimName = dim.getAttribute('name')?.toLowerCase();
      if (dimName === 'time') {
        hasTime = true;
        const content = dim.textContent?.trim();
        if (content) {
          const parts = content.split('/');
          if (parts.length >= 2) {
            timeExtent = {
              start: parts[0],
              end: parts[1]
            };
          }
        }
      }
    });

    if (hasTime || (layerNames && layerNames.includes(name))) {
      results.push({ layerName: name, hasTime, timeExtent });
    }
  });

  return results;
}

export async function checkWMSTimeSupport(wmsUrl: string, layerNames?: string[]): Promise<WMSCapabilitiesResult> {
  const cacheKey = `${wmsUrl}|${(layerNames || []).sort().join(',')}`;

  const cached = capabilitiesCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const doc = await fetchWMSCapabilities(wmsUrl);
  if (!doc) {
    const result: WMSCapabilitiesResult = {
      success: false,
      error: 'Failed to fetch capabilities',
      layers: []
    };
    capabilitiesCache.set(cacheKey, result);
    return result;
  }

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    const result: WMSCapabilitiesResult = {
      success: false,
      error: 'Invalid XML response',
      layers: []
    };
    capabilitiesCache.set(cacheKey, result);
    return result;
  }

  const layers = parseTimeCapabilities(doc, layerNames);
  const result: WMSCapabilitiesResult = {
    success: true,
    layers
  };

  capabilitiesCache.set(cacheKey, result);
  return result;
}

export async function checkLayerTimeSupport(config: LayerConfig): Promise<boolean> {
  if (config.type !== 'wms') return false;

  const layerNames = config.options?.layerNames || [];
  const result = await checkWMSTimeSupport(config.source, layerNames);

  if (!result.success) return false;

  return result.layers.some(layer => layer.hasTime);
}

export function clearCapabilitiesCache(): void {
  capabilitiesCache.clear();
}
