import { MapLayersData, LayerConfig } from './types';
import { collectReferencedLayerIds } from './utils';

export const LAYER_TYPES = ['wms', 'tiled', 'mapImage', 'portalItem'] as const;
export type LayerType = typeof LAYER_TYPES[number];

export const getDefaultLayerConfig = (type: LayerType, id: string): LayerConfig => {
  const base: LayerConfig = {
    id,
    type,
    opacity: 1,
    zIndex: 0
  };
  
  switch (type) {
    case 'wms':
      return {
        ...base,
        source: 'https://example.com/wms',
        layerNames: ''
      };
    case 'tiled':
      return {
        ...base,
        source: 'https://example.com/tiles/{z}/{y}/{x}.png'
      };
    case 'mapImage':
      return {
        ...base,
        source: 'https://example.com/arcgis/rest/services/MapServer'
      };
    case 'portalItem':
      return {
        ...base,
        source: 'portal-item-id',
        options: {
          layerId: '0'
        }
      };
    default:
      return base;
  }
};

export const validateLayer = (layer: LayerConfig): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!layer.id || layer.id.trim() === '') {
    errors.push('Layer ID is required');
  }
  
  if (!LAYER_TYPES.includes(layer.type as LayerType)) {
    errors.push(`Invalid layer type: ${layer.type}`);
  }
  
  if (!layer.source || layer.source.trim() === '') {
    errors.push('Layer source is required');
  }
  
  if (layer.type === 'wms' && (!layer.layerNames || layer.layerNames.trim() === '')) {
    errors.push('WMS layers require layerNames');
  }
  
  if (layer.opacity !== undefined && (layer.opacity < 0 || layer.opacity > 1)) {
    errors.push('Opacity must be between 0 and 1');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const upsertLayer = (data: MapLayersData, layer: LayerConfig): MapLayersData => {
  const updatedData = { ...data };
  const existingIndex = updatedData.layers.findIndex(l => l.id === layer.id);
  
  if (existingIndex >= 0) {
    // Update existing layer
    updatedData.layers = [...updatedData.layers];
    updatedData.layers[existingIndex] = layer;
  } else {
    // Add new layer
    updatedData.layers = [...updatedData.layers, layer];
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