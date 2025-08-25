import { MapLayersData, ValidationResult, StatsData } from './types';
import { safeParse, collectItemIds, collectReferencedLayerIds } from './utils';
import { settings } from './settings';

export const validateJSON = (text: string): ValidationResult => {
  const [parsed, parseError] = safeParse(text);
  
  if (parseError) {
    return {
      valid: false,
      errors: [`JSON Parse Error: ${parseError}`],
      warnings: []
    };
  }
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic structure validation
  if (!parsed || typeof parsed !== 'object') {
    errors.push('Root must be an object');
    return { valid: false, errors, warnings };
  }
  
  // Required arrays
  const requiredArrays = ['weatherFeatures', 'features', 'layers'];
  for (const key of requiredArrays) {
    if (!Array.isArray(parsed[key])) {
      errors.push(`Missing or invalid '${key}' array`);
    }
  }
  
  // Internationalization object
  if (!parsed.intl || typeof parsed.intl !== 'object') {
    errors.push("Missing or invalid 'intl' object");
  } else {
    const expectedLangs = ['en', 'da', 'nb', 'sv'];
    for (const lang of expectedLangs) {
      if (!parsed.intl[lang] || typeof parsed.intl[lang] !== 'object') {
        warnings.push(`Missing or invalid '${lang}' translations`);
      }
    }
  }
  
  // Feature validation - required fields per Dart model
  const allFeatures = [...(parsed.weatherFeatures || []), ...(parsed.features || [])];
  allFeatures.forEach((feature: any, index: number) => {
    const featureType = index < (parsed.weatherFeatures?.length || 0) ? 'weatherFeature' : 'feature';
    const featureIndex = index < (parsed.weatherFeatures?.length || 0) 
      ? index 
      : index - (parsed.weatherFeatures?.length || 0);
    
    // Required: presentation field
    if (!feature.presentation || !['single', 'multiple'].includes(feature.presentation)) {
      errors.push(`${featureType} ${featureIndex + 1}: presentation field is required and must be "single" or "multiple"`);
    }
    
    // Required: items array (non-null, array)
    if (!feature.items || !Array.isArray(feature.items)) {
      errors.push(`${featureType} ${featureIndex + 1}: items field is required and must be an array`);
    } else {
      // Validate each item has required fields
      feature.items.forEach((item: any, itemIndex: number) => {
        if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
          errors.push(`${featureType} ${featureIndex + 1}, item ${itemIndex + 1}: id is required and cannot be empty`);
        }
        if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
          errors.push(`${featureType} ${featureIndex + 1}, item ${itemIndex + 1}: name is required and cannot be empty`);
        }
        if (!item.layersIds || !Array.isArray(item.layersIds) || item.layersIds.length === 0) {
          errors.push(`${featureType} ${featureIndex + 1}, item ${itemIndex + 1}: layersIds is required and must be a non-empty array`);
        }
      });
    }
  });

  // Layer validation - required fields per Dart model
  if (parsed.layers && Array.isArray(parsed.layers)) {
    parsed.layers.forEach((layer: any, layerIndex: number) => {
      // Required: id field
      if (!layer.id || typeof layer.id !== 'string' || layer.id.trim() === '') {
        errors.push(`layer ${layerIndex + 1}: id is required and cannot be empty`);
      }
      
      // Required: layers array
      if (!layer.layers || !Array.isArray(layer.layers) || layer.layers.length === 0) {
        errors.push(`layer ${layerIndex + 1}: layers field is required and must be a non-empty array`);
      } else {
        // Validate each sublayer
        layer.layers.forEach((sublayer: any, sublayerIndex: number) => {
          // Required: type field
          if (!sublayer.type || typeof sublayer.type !== 'string') {
            errors.push(`layer ${layerIndex + 1}, sublayer ${sublayerIndex + 1}: type is required`);
          }
          // Required: source field
          if (!sublayer.source || typeof sublayer.source !== 'string' || sublayer.source.trim() === '') {
            errors.push(`layer ${layerIndex + 1}, sublayer ${sublayerIndex + 1}: source is required and cannot be empty`);
          }
        });
      }
    });
  }

  // Layer ID validation
  try {
    const usedLayerIds = collectReferencedLayerIds(parsed as MapLayersData);
    const definedLayerIds = new Set((parsed.layers || []).map((l: any) => l.id).filter(Boolean));
    
    const missingLayers = [...usedLayerIds].filter(id => !definedLayerIds.has(id));
    if (missingLayers.length > 0) {
      warnings.push(`Missing layer definitions: ${missingLayers.join(', ')}`);
    }
  } catch (e) {
    warnings.push('Could not validate layer references');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

export const formatJSON = (data: any): string => {
  return JSON.stringify(data, null, 2);
};

export const recomputeStats = (data: MapLayersData): StatsData => {
  try {
    const usedLayers = collectReferencedLayerIds(data);
    const definedLayers = new Set((data.layers || []).map(x => x.id));
    
    // Also consider layers marked as "referenced" in settings as used
    const referencedInSettings = settings.value.customLogicLayers;
    const allUsedLayers = new Set([...usedLayers, ...referencedInSettings]);
    
    const missingLayers = [...usedLayers].filter(x => !definedLayers.has(x));
    const unusedLayers = [...definedLayers].filter(x => !allUsedLayers.has(x));
    
    const keys = collectItemIds(data);
    const langs = Object.keys(data.intl || {});
    const missingIntl: { [lang: string]: string[] } = {};
    
    for (const lang of langs) {
      const dict = data.intl[lang] || {};
      missingIntl[lang] = [...keys].filter(k => !(k in dict));
    }
    
    return {
      missingLayers,
      unusedLayers,
      missingIntl,
      weatherFeatureCount: data.weatherFeatures?.length || 0,
      featureCount: data.features?.length || 0,
      layerCount: data.layers?.length || 0,
      languageCount: langs.length
    };
  } catch (e) {
    console.warn('Error computing stats:', e);
    return {
      missingLayers: [],
      unusedLayers: [],
      missingIntl: {},
      weatherFeatureCount: 0,
      featureCount: 0,
      layerCount: 0,
      languageCount: 0
    };
  }
};

export const summarizeData = (data: MapLayersData): string => {
  const stats = recomputeStats(data);
  return `WF: ${stats.weatherFeatureCount} • F: ${stats.featureCount} • Layers: ${stats.layerCount} • Langs: ${stats.languageCount}`;
};