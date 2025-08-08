import { MapLayersData, IntlDict, MapFeature } from './types';
import { collectItemIds } from './utils';

export const SUPPORTED_LANGUAGES = ['en', 'da', 'nb', 'sv'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Auto-sync translations when features are created/modified
export const autoSyncFeatureTranslations = (data: MapLayersData, feature: MapFeature): MapLayersData => {
  const updatedData = { ...data };
  
  // Ensure intl object exists
  if (!updatedData.intl) {
    updatedData.intl = { en: {}, da: {}, nb: {}, sv: {} };
  }
  
  // Collect keys from the feature
  const keysToSync: Array<{ key: string; defaultValue: string }> = [];
  
  // Add feature ID only (not names)
  if (feature.id?.trim()) {
    keysToSync.push({ 
      key: feature.id, 
      defaultValue: feature.name?.trim() || feature.id 
    });
  }
  
  // Add item IDs only (not names)
  (feature.items || []).forEach(item => {
    if (item.id?.trim()) {
      keysToSync.push({ 
        key: item.id, 
        defaultValue: item.name?.trim() || item.id 
      });
    }
    if (item.legendDescription?.trim()) {
      keysToSync.push({ 
        key: item.legendDescription, 
        defaultValue: item.legendDescription 
      });
    }
  });
  
  // Ensure keys exist in all languages
  SUPPORTED_LANGUAGES.forEach(lang => {
    if (!updatedData.intl[lang]) {
      updatedData.intl[lang] = {};
    }
    
    keysToSync.forEach(({ key, defaultValue }) => {
      // Only add if key doesn't exist yet
      if (!updatedData.intl[lang][key]) {
        if (lang === 'en') {
          updatedData.intl[lang][key] = defaultValue;
        } else {
          // For other languages, use English version if available, otherwise use key
          updatedData.intl[lang][key] = updatedData.intl.en[key] || defaultValue;
        }
      }
    });
  });
  
  return updatedData;
};

export const syncTranslations = (data: MapLayersData): MapLayersData => {
  const updatedData = { ...data };
  const en = (updatedData.intl?.en || {}) as IntlDict;
  const fallback: IntlDict = {};
  
  // Build fallback translations from feature/item names
  const addFallback = (id: string, display?: string) => {
    if (!fallback[id] && display) {
      fallback[id] = display;
    }
  };
  
  const scanGroupArr = (arr: any[]) => {
    for (const g of arr || []) {
      if (g.id && g.name) addFallback(g.id, g.name);
      for (const it of g.items || []) {
        if (it.id && it.name) addFallback(it.id, it.name);
        if (it.legendDescription) {
          addFallback(it.legendDescription, en[it.legendDescription] || it.legendDescription);
        }
      }
    }
  };
  
  scanGroupArr(updatedData.weatherFeatures);
  scanGroupArr(updatedData.features);
  
  const allKeys = new Set([...collectItemIds(updatedData)]);
  
  // Ensure intl object exists
  if (!updatedData.intl) {
    updatedData.intl = { en: {}, da: {}, nb: {}, sv: {} };
  }
  
  // Sync all languages
  SUPPORTED_LANGUAGES.forEach(lang => {
    const existing = updatedData.intl[lang] || {};
    const updated: IntlDict = {};
    
    // Add all expected keys
    allKeys.forEach(key => {
      if (existing[key]) {
        // Keep existing translation
        updated[key] = existing[key];
      } else if (lang === 'en' && fallback[key]) {
        // Use fallback for English
        updated[key] = fallback[key];
      } else if (en[key]) {
        // Use English as fallback for other languages
        updated[key] = en[key];
      } else {
        // Use key as fallback
        updated[key] = key;
      }
    });
    
    updatedData.intl[lang] = updated;
  });
  
  return updatedData;
};

export const pruneTranslations = (data: MapLayersData): MapLayersData => {
  const updatedData = { ...data };
  const expectedKeys = collectItemIds(updatedData);
  
  if (!updatedData.intl) return updatedData;
  
  // Remove unused translations from all languages
  SUPPORTED_LANGUAGES.forEach(lang => {
    if (updatedData.intl[lang]) {
      const filtered: IntlDict = {};
      Object.keys(updatedData.intl[lang]).forEach(key => {
        if (expectedKeys.has(key)) {
          filtered[key] = updatedData.intl[lang][key];
        }
      });
      updatedData.intl[lang] = filtered;
    }
  });
  
  return updatedData;
};

export const getMissingTranslations = (data: MapLayersData, lang: SupportedLanguage): string[] => {
  const expectedKeys = collectItemIds(data);
  const actualKeys = new Set(Object.keys(data.intl?.[lang] || {}));
  return [...expectedKeys].filter(key => !actualKeys.has(key));
};

export const getExtraTranslations = (data: MapLayersData, lang: SupportedLanguage): string[] => {
  const expectedKeys = collectItemIds(data);
  const actualKeys = new Set(Object.keys(data.intl?.[lang] || {}));
  return [...actualKeys].filter(key => !expectedKeys.has(key));
};

export const getTranslationStatus = (data: MapLayersData, lang: SupportedLanguage) => {
  const missing = getMissingTranslations(data, lang);
  const extra = getExtraTranslations(data, lang);
  const expectedKeys = collectItemIds(data);
  const good = [...expectedKeys].filter(key => 
    data.intl?.[lang]?.[key] !== undefined
  );
  
  return {
    good: good.length,
    missing: missing.length,
    extra: extra.length,
    missingKeys: missing,
    extraKeys: extra
  };
};