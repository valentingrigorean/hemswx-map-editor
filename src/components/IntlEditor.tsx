import { useComputed } from '@preact/signals';
import { jsonData, updateJsonData } from '../lib/jsonStore';
import { SUPPORTED_LANGUAGES } from '../lib/intl';
import { MapFeature } from '../lib/types';

interface IntlEditorProps {
  feature: MapFeature;
  isEditing: boolean;
}

export default function IntlEditor({ feature, isEditing }: IntlEditorProps) {
  const data = useComputed(() => jsonData.value);

  // Collect all translation keys from the current feature (IDs only)
  const translationKeys = useComputed(() => {
    const keys: string[] = [];
    
    // Add feature ID only (not name)
    if (feature.id?.trim()) keys.push(feature.id);
    
    // Add all item IDs only (not names)
    (feature.items || []).forEach(item => {
      if (item.id?.trim()) keys.push(item.id);
      if (item.legendDescription?.trim()) keys.push(item.legendDescription);
    });
    
    return [...new Set(keys)]; // Remove duplicates
  });

  // Get translation status for each key
  const translationStatus = useComputed(() => {
    return translationKeys.value.map(key => {
      const translations: { [lang: string]: string } = {};
      let missingCount = 0;
      
      SUPPORTED_LANGUAGES.forEach(lang => {
        const value = data.value.intl?.[lang]?.[key] || '';
        translations[lang] = value;
        if (!value.trim()) missingCount++;
      });
      
      return {
        key,
        translations,
        missingCount,
        isComplete: missingCount === 0,
        completionPercentage: Math.round(((SUPPORTED_LANGUAGES.length - missingCount) / SUPPORTED_LANGUAGES.length) * 100)
      };
    });
  });

  const overallCompletionPercentage = useComputed(() => {
    if (translationStatus.value.length === 0) return 100;
    
    const totalTranslations = translationStatus.value.length * SUPPORTED_LANGUAGES.length;
    const completeTranslations = translationStatus.value.reduce((sum, status) => 
      sum + (SUPPORTED_LANGUAGES.length - status.missingCount), 0);
    
    return Math.round((completeTranslations / totalTranslations) * 100);
  });

  const handleTranslationChange = (key: string, lang: string, value: string) => {
    const updated = { ...data.value, intl: { ...data.value.intl } } as any;
    
    // Ensure language object exists
    if (!updated.intl[lang]) {
      updated.intl[lang] = {};
    }
    
    updated.intl[lang] = { ...updated.intl[lang], [key]: value };
    updateJsonData(updated);
  };

  const fillMissingFromEnglish = (key: string) => {
    const status = translationStatus.value.find(s => s.key === key);
    if (!status) return;
    
    const englishValue = status.translations.en;
    if (!englishValue.trim()) return;
    
    const updated = { ...data.value, intl: { ...data.value.intl } } as any;
    
    SUPPORTED_LANGUAGES.forEach(lang => {
      if (lang !== 'en' && !status.translations[lang].trim()) {
        if (!updated.intl[lang]) updated.intl[lang] = {};
        updated.intl[lang][key] = englishValue;
      }
    });
    
    updateJsonData(updated);
  };

  const clearTranslations = (key: string) => {
    if (!confirm(`Clear all translations for "${key}"?`)) return;
    
    const updated = { ...data.value, intl: { ...data.value.intl } } as any;
    
    SUPPORTED_LANGUAGES.forEach(lang => {
      if (updated.intl[lang] && updated.intl[lang][key]) {
        delete updated.intl[lang][key];
      }
    });
    
    updateJsonData(updated);
  };

  const getKeyContext = (key: string): string => {
    // Determine what this key represents
    if (key === feature.id) return 'Feature ID';
    
    const item = (feature.items || []).find(i => i.id === key || i.legendDescription === key);
    if (item) {
      if (item.id === key) return `Item ID (${item.name || 'Unnamed'})`;
      if (item.legendDescription === key) return `Legend Description (${item.name || item.id || 'Unnamed'})`;
    }
    
    return 'Unknown';
  };

  if (translationKeys.value.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-slate-500">
          <div className="text-4xl mb-3">🌐</div>
          <div className="text-sm font-medium mb-1">No Translation Keys</div>
          <div className="text-xs">Add feature and item IDs to enable translations</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with overall status */}
      <div className="mb-4 pb-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-slate-200">Translations</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {translationKeys.value.length} key{translationKeys.value.length !== 1 ? 's' : ''}
            </span>
            <div className={`pill ${overallCompletionPercentage.value === 100 ? 'ok' : overallCompletionPercentage.value > 50 ? 'warn' : 'error'}`}>
              {overallCompletionPercentage.value}% complete
            </div>
          </div>
        </div>
        
        <div className="text-xs text-slate-500">
          Manage translations for all feature and item IDs. Missing translations will fall back to English or the ID itself.
        </div>
      </div>

      {/* Translation keys list */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {translationStatus.value.map(status => (
          <div key={status.key} className="border border-slate-600 rounded-lg p-4 bg-slate-900/50">
            {/* Key header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm text-slate-300 font-mono">{status.key}</code>
                  <span className="text-xs text-slate-500">({getKeyContext(status.key)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`pill tiny ${status.isComplete ? 'ok' : status.completionPercentage > 50 ? 'warn' : 'error'}`}>
                    {status.completionPercentage}%
                  </div>
                  {status.missingCount > 0 && (
                    <span className="text-xs text-orange-400">
                      {status.missingCount} missing
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-1">
                {status.missingCount > 0 && status.translations.en.trim() && (
                  <button 
                    className="btn tiny"
                    onClick={() => fillMissingFromEnglish(status.key)}
                    disabled={!isEditing}
                    title="Fill missing translations with English text"
                  >
                    Fill EN
                  </button>
                )}
                <button 
                  className="btn danger tiny"
                  onClick={() => clearTranslations(status.key)}
                  disabled={!isEditing}
                  title="Clear all translations for this key"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Language inputs */}
            <div className="grid gap-3">
              {SUPPORTED_LANGUAGES.map(lang => (
                <div key={lang} className="grid grid-cols-4 gap-2 items-start">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-slate-700 px-2 py-1 rounded text-center min-w-[2.5rem]">
                      {lang.toUpperCase()}
                    </span>
                    {lang === 'en' && <span className="text-slate-500 text-xs">Default</span>}
                    {!status.translations[lang].trim() && (
                      <span className="text-orange-400 text-xs">•</span>
                    )}
                  </div>
                  <div className="col-span-3">
                    <textarea
                      className="form-textarea text-xs"
                      rows={2}
                      value={status.translations[lang]}
                      onInput={(e) => handleTranslationChange(
                        status.key, 
                        lang, 
                        (e.target as HTMLTextAreaElement).value
                      )}
                      placeholder={lang === 'en' ? `Enter ${lang.toUpperCase()} text` : `Translate to ${lang.toUpperCase()}`}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer info */}
      <div className="mt-4 pt-3 border-t border-slate-700">
        <div className="text-xs text-slate-500">
          <div className="mb-1">
            <strong>Translation Coverage:</strong> {SUPPORTED_LANGUAGES.length * translationKeys.value.length - translationStatus.value.reduce((sum, s) => sum + s.missingCount, 0)}/{SUPPORTED_LANGUAGES.length * translationKeys.value.length} entries complete
          </div>
          {!isEditing && (
            <div className="text-slate-400">
              <em>Enable editing mode to modify translations</em>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}