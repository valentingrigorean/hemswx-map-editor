import { MapFeature, MapLayerItem, LayerConfig, LayerEntry, ValidationResult } from './types';

/**
 * Comprehensive feature validation matching Dart model requirements
 */
export const validateFeature = (feature: MapFeature): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: presentation field
  if (!feature.presentation) {
    errors.push('presentation field is required');
  } else if (!['single', 'multiple'].includes(feature.presentation)) {
    errors.push('presentation must be "single" or "multiple"');
  }

  // Required: items array (non-null, array)
  if (!feature.items) {
    errors.push('items field is required');
  } else if (!Array.isArray(feature.items)) {
    errors.push('items must be an array');
  } else if (feature.items.length === 0) {
    warnings.push('items array is empty - feature will not be functional');
  } else {
    // Validate each item
    feature.items.forEach((item, index) => {
      const itemErrors = validateFeatureItem(item);
      errors.push(...itemErrors.errors.map(err => `Item ${index + 1}: ${err}`));
      warnings.push(...itemErrors.warnings.map(warn => `Item ${index + 1}: ${warn}`));
    });
  }

  return { valid: errors.length === 0, errors, warnings };
};

/**
 * Validate a single feature item matching Dart FeatureItemEntity requirements
 */
export const validateFeatureItem = (item: MapLayerItem): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: id field
  if (!item.id) {
    errors.push('id is required');
  } else if (typeof item.id !== 'string') {
    errors.push('id must be a string');
  } else if (item.id.trim() === '') {
    errors.push('id cannot be empty or whitespace only');
  }

  // Required: name field  
  if (!item.name) {
    errors.push('name is required');
  } else if (typeof item.name !== 'string') {
    errors.push('name must be a string');
  } else if (item.name.trim() === '') {
    errors.push('name cannot be empty or whitespace only');
  }

  // Required: layersIds field
  if (!item.layersIds) {
    errors.push('layersIds is required');
  } else if (!Array.isArray(item.layersIds)) {
    errors.push('layersIds must be an array');
  } else if (item.layersIds.length === 0) {
    errors.push('layersIds must contain at least one layer ID');
  } else {
    // Validate each layer ID is a non-empty string
    item.layersIds.forEach((layerId, index) => {
      if (!layerId || typeof layerId !== 'string' || layerId.trim() === '') {
        errors.push(`layersIds[${index}] must be a non-empty string`);
      }
    });
  }

  // Optional: showLegend validation
  if (item.showLegend !== undefined && typeof item.showLegend !== 'boolean') {
    errors.push('showLegend must be a boolean');
  }

  // Optional: legendUrl validation
  if (item.legendUrl !== undefined) {
    if (typeof item.legendUrl !== 'string') {
      errors.push('legendUrl must be a string');
    } else if (item.legendUrl.trim() === '') {
      warnings.push('legendUrl is empty - consider removing it');
    }
  }

  // Optional: legendDescription validation
  if (item.legendDescription !== undefined) {
    if (typeof item.legendDescription !== 'string') {
      errors.push('legendDescription must be a string');
    } else if (item.legendDescription.trim() === '') {
      warnings.push('legendDescription is empty - consider removing it');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
};

/**
 * Validate layer config matching Dart MapLayerEntity requirements
 */
export const validateLayerConfig = (layer: LayerConfig): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: type field
  if (!layer.type) {
    errors.push('type is required');
  } else if (!['wms', 'tiled', 'mapImage', 'portalItem', 'vectorTiled', 'feature'].includes(layer.type)) {
    errors.push('type must be one of: wms, tiled, mapImage, portalItem, vectorTiled, feature');
  }

  // Required: source field
  if (!layer.source) {
    errors.push('source is required');
  } else if (typeof layer.source !== 'string') {
    errors.push('source must be a string');
  } else if (layer.source.trim() === '') {
    errors.push('source cannot be empty');
  }

  // Optional: zIndex validation (defaults to 0 in Dart)
  if (layer.zIndex !== undefined) {
    if (typeof layer.zIndex !== 'number') {
      errors.push('zIndex must be a number');
    } else if (!Number.isInteger(layer.zIndex)) {
      errors.push('zIndex must be an integer');
    }
  }

  // Optional: refreshInterval validation
  if (layer.refreshInterval !== undefined) {
    if (typeof layer.refreshInterval !== 'number') {
      errors.push('refreshInterval must be a number');
    } else if (layer.refreshInterval < 0) {
      errors.push('refreshInterval must be non-negative');
    } else if (!Number.isInteger(layer.refreshInterval)) {
      errors.push('refreshInterval must be an integer (milliseconds)');
    }
  }

  // Optional: options.opacity validation (matches Dart implementation)
  if (layer.options?.opacity !== undefined) {
    if (typeof layer.options.opacity !== 'number') {
      errors.push('opacity (in options) must be a number');
    } else if (layer.options.opacity < 0 || layer.options.opacity > 1) {
      errors.push('opacity must be between 0.0 and 1.0');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
};

/**
 * Validate layer entry matching Dart LayerEntity requirements
 */
export const validateLayerEntry = (entry: LayerEntry): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: id field
  if (!entry.id) {
    errors.push('id is required');
  } else if (typeof entry.id !== 'string') {
    errors.push('id must be a string');
  } else if (entry.id.trim() === '') {
    errors.push('id cannot be empty');
  }

  // Required: layers array
  if (!entry.layers) {
    errors.push('layers field is required');
  } else if (!Array.isArray(entry.layers)) {
    errors.push('layers must be an array');
  } else if (entry.layers.length === 0) {
    errors.push('layers array cannot be empty');
  } else {
    // Validate each layer config
    entry.layers.forEach((layer, index) => {
      const layerResult = validateLayerConfig(layer);
      errors.push(...layerResult.errors.map(err => `Layer ${index + 1}: ${err}`));
      warnings.push(...layerResult.warnings.map(warn => `Layer ${index + 1}: ${warn}`));
    });
  }

  return { valid: errors.length === 0, errors, warnings };
};