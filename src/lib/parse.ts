import { MapLayersData, ValidationResult, StatsData } from './types';
import { safeParse, collectItemIds, collectReferencedLayerIds } from './utils';

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
    const missingLayers = [...usedLayers].filter(x => !definedLayers.has(x));
    const unusedLayers = [...definedLayers].filter(x => !usedLayers.has(x));
    
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