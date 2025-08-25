import { MapLayersData, LayerConfig, LayerEntry } from './types';
import { collectReferencedLayerIds } from './utils';

export const LAYER_TYPES = ['wms', 'tiled', 'mapImage', 'portalItem', 'vectorTiled', 'feature'] as const;
export type LayerType = typeof LAYER_TYPES[number];

export const getDefaultLayerConfig = (type: LayerType): LayerConfig => {
  const base: LayerConfig = { type, source: '', zIndex: 0, options: { opacity: 1 } };
  switch (type) {
    case 'wms':
      return { ...base, source: 'https://example.com/wms', options: { layerNames: ['layer1'], opacity: 1 } };
    case 'tiled':
      return { ...base, source: 'https://example.com/tiles/{z}/{y}/{x}.png' };
    case 'vectorTiled':
      return { ...base, source: 'https://example.com/vectortiles/{z}/{y}/{x}.pbf' };
    case 'mapImage':
      return { ...base, source: 'https://example.com/arcgis/rest/services/MapServer' };
    case 'feature':
      return { ...base, source: 'https://example.com/arcgis/rest/services/FeatureServer/0' };
    case 'portalItem':
      return { ...base, source: 'portal-item-id', options: { layerId: 0, opacity: 1 } };
    default:
      return base;
  }
};

export const getDefaultLayerEntry = (id = ''): LayerEntry => ({
  id,
  layers: [getDefaultLayerConfig('wms')]
});

export const validateLayer = (layer: LayerConfig): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!LAYER_TYPES.includes(layer.type as LayerType)) {
    errors.push(`Invalid layer type "${layer.type}". Must be one of: ${LAYER_TYPES.join(', ')}`);
  }
  
  if (!layer.source || layer.source.trim() === '') {
    errors.push('Layer source is required and cannot be empty');
  } else {
    // Type-specific source validation
    if (layer.type === 'portalItem') {
      if (layer.source.length < 10 || layer.source.includes(' ')) {
        errors.push('Portal item source should be a valid portal item ID (no spaces, at least 10 characters)');
      }
    } else if (layer.type !== 'portalItem' && !layer.source.startsWith('http')) {
      errors.push(`${layer.type.toUpperCase()} layers typically require a URL starting with http:// or https://`);
    }
  }
  
  if (layer.type === 'wms') {
    const layerNames = layer.options?.layerNames;
    if (!layerNames || !Array.isArray(layerNames) || layerNames.length === 0) {
      errors.push('WMS layers require layerNames array in options (list of layer names to include)');
    }
  }
  
  // Opacity validation - now in options per Dart model
  if (layer.options?.opacity !== undefined) {
    const opacity = layer.options.opacity;
    if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
      errors.push('Opacity (in options) must be a number between 0.0 (transparent) and 1.0 (opaque)');
    }
  }
  
  if (layer.zIndex !== undefined && !Number.isInteger(layer.zIndex)) {
    errors.push('Z-Index must be a whole number (determines layer stacking order)');
  }
  
  if (layer.refreshInterval !== undefined) {
    if (typeof layer.refreshInterval !== 'number' || layer.refreshInterval < 0) {
      errors.push('Refresh interval must be a positive number (milliseconds)');
    } else if (!Number.isInteger(layer.refreshInterval)) {
      errors.push('Refresh interval must be a whole number of milliseconds');
    }
  }
  
  return { valid: errors.length === 0, errors };
};

export const validateLayerEntry = (entry: LayerEntry): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!entry.id || entry.id.trim() === '') {
    errors.push('Layer ID is required and cannot be empty');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(entry.id.trim())) {
    errors.push('Layer ID can only contain letters, numbers, hyphens, and underscores');
  }
  if (!entry.layers || entry.layers.length === 0) {
    errors.push('Layer must contain at least one sublayer');
  }
  entry.layers.forEach((l, idx) => {
    const r = validateLayer(l);
    if (!r.valid) {
      errors.push(...r.errors.map(e => `Sublayer ${idx + 1}: ${e}`));
    }
  });
  return { valid: errors.length === 0, errors };
};

export const upsertLayerEntry = (data: MapLayersData, entry: LayerEntry): MapLayersData => {
  const updatedData = { ...data };
  const existingIndex = updatedData.layers.findIndex(l => l.id === entry.id);
  if (existingIndex >= 0) {
    updatedData.layers = [...updatedData.layers];
    updatedData.layers[existingIndex] = entry;
  } else {
    updatedData.layers = [...updatedData.layers, entry];
  }
  return updatedData;
};

export const deleteLayer = (data: MapLayersData, layerId: string): MapLayersData => {
  const updatedData = { ...data };
  updatedData.layers = updatedData.layers.filter(l => l.id !== layerId);
  return updatedData;
};

export const getUnusedLayers = (data: MapLayersData): string[] => {
  const usedLayers = collectReferencedLayerIds(data);
  const definedLayers = new Set(data.layers.map(l => l.id));
  return [...definedLayers].filter(id => !usedLayers.has(id));
};

export const getMissingLayers = (data: MapLayersData): string[] => {
  const usedLayers = collectReferencedLayerIds(data);
  const definedLayers = new Set(data.layers.map(l => l.id));
  return [...usedLayers].filter(id => !definedLayers.has(id));
};

export const pruneUnusedLayers = (data: MapLayersData): MapLayersData => {
  const unusedLayers = new Set(getUnusedLayers(data));
  const updatedData = { ...data };
  updatedData.layers = updatedData.layers.filter(l => !unusedLayers.has(l.id));
  return updatedData;
};

export const wireItemToLayers = (
  data: MapLayersData, 
  featureType: 'weatherFeatures' | 'features',
  featureIndex: number,
  itemIndex: number,
  layerIds: string[]
): MapLayersData => {
  const updatedData = { ...data };
  const featureArray = updatedData[featureType];
  
  if (featureArray[featureIndex] && featureArray[featureIndex].items[itemIndex]) {
    // Create new array references to maintain immutability
    updatedData[featureType] = [...featureArray];
    updatedData[featureType][featureIndex] = {
      ...featureArray[featureIndex],
      items: [...featureArray[featureIndex].items]
    };
    updatedData[featureType][featureIndex].items[itemIndex] = {
      ...featureArray[featureIndex].items[itemIndex],
      layersIds: [...layerIds]
    };
  }
  
  return updatedData;
};
