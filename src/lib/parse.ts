import { MapLayersData, ValidationResult } from './types';
import { safeParse, collectReferencedLayerIds } from './utils';
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

  // Basemap validation (optional field)
  if (parsed.baseMaps !== undefined) {
    if (!Array.isArray(parsed.baseMaps)) {
      errors.push("'baseMaps' must be an array if present");
    } else {
      const basemapIds = new Set<string>();
      parsed.baseMaps.forEach((basemap: any, idx: number) => {
        const prefix = `basemap ${idx + 1}`;

        // Required: id field
        if (!basemap.id || typeof basemap.id !== 'string' || basemap.id.trim() === '') {
          errors.push(`${prefix}: id is required and cannot be empty`);
        } else {
          if (basemapIds.has(basemap.id)) {
            errors.push(`${prefix}: duplicate id "${basemap.id}"`);
          }
          basemapIds.add(basemap.id);
        }

        // Required: name field
        if (!basemap.name || typeof basemap.name !== 'string' || basemap.name.trim() === '') {
          errors.push(`${prefix}: name is required and cannot be empty`);
        }

        // Required: baseLayers array
        if (!basemap.baseLayers || !Array.isArray(basemap.baseLayers)) {
          errors.push(`${prefix}: baseLayers is required and must be an array`);
        } else {
          basemap.baseLayers.forEach((layer: any, layerIdx: number) => {
            validateMapLayerEntity(layer, `${prefix}, baseLayer ${layerIdx + 1}`, errors);
          });
        }

        // Optional but must be array: referenceLayers
        if (basemap.referenceLayers !== undefined && !Array.isArray(basemap.referenceLayers)) {
          errors.push(`${prefix}: referenceLayers must be an array if present`);
        } else if (Array.isArray(basemap.referenceLayers)) {
          basemap.referenceLayers.forEach((layer: any, layerIdx: number) => {
            validateMapLayerEntity(layer, `${prefix}, referenceLayer ${layerIdx + 1}`, errors);
          });
        }

        // Optional: countries validation
        if (basemap.countries !== undefined) {
          if (!Array.isArray(basemap.countries)) {
            errors.push(`${prefix}: countries must be an array if present`);
          } else {
            const validCountries = ['world', 'no', 'se', 'dk', 'fi'];
            basemap.countries.forEach((c: any, cIdx: number) => {
              if (!validCountries.includes(c)) {
                warnings.push(`${prefix}: unknown country code "${c}" at index ${cIdx}`);
              }
            });
          }
        }

        // Optional: unitType validation
        if (basemap.unitType !== undefined) {
          const validUnitTypes = ['metric', 'aviation', 'nautical'];
          if (!validUnitTypes.includes(basemap.unitType)) {
            warnings.push(`${prefix}: unknown unitType "${basemap.unitType}"`);
          }
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

// Helper to validate a MapLayerEntity (used in basemaps)
function validateMapLayerEntity(layer: any, prefix: string, errors: string[]) {
  const validLayerTypes = ['wms', 'tiled', 'mapImage', 'portalItem', 'vectorTiled', 'feature', 'wmts', 'sceneLayer', 'unknown'];

  if (!layer.type || typeof layer.type !== 'string') {
    errors.push(`${prefix}: type is required`);
  } else if (!validLayerTypes.includes(layer.type)) {
    errors.push(`${prefix}: unknown type "${layer.type}"`);
  }

  if (!layer.source || typeof layer.source !== 'string' || layer.source.trim() === '') {
    errors.push(`${prefix}: source is required and cannot be empty`);
  }

  if (layer.sourceKind !== undefined) {
    const validSourceKinds = ['uri', 'portalItem'];
    if (!validSourceKinds.includes(layer.sourceKind)) {
      errors.push(`${prefix}: sourceKind must be "uri" or "portalItem"`);
    }
  }
}

export const formatJSON = (data: any): string => {
  return JSON.stringify(data, null, 2);
};

export const summarizeData = (data: MapLayersData): string => {
  try {
    const weatherFeatureCount = data.weatherFeatures?.length || 0;
    const featureCount = data.features?.length || 0;
    const layerCount = data.layers?.length || 0;
    const basemapCount = data.baseMaps?.length || 0;
    const languageCount = Object.keys(data.intl || {}).length;

    const parts = [
      `WF: ${weatherFeatureCount}`,
      `F: ${featureCount}`,
      `Layers: ${layerCount}`
    ];
    if (basemapCount > 0) {
      parts.push(`Maps: ${basemapCount}`);
    }
    parts.push(`Langs: ${languageCount}`);
    return parts.join(' • ');
  } catch (e) {
    return 'Error computing summary';
  }
};