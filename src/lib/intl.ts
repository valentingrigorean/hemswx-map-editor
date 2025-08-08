import { MapLayersData, IntlDict } from './types';
import { collectItemIds } from './utils';

export const SUPPORTED_LANGUAGES = ['en', 'da', 'nb', 'sv'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

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