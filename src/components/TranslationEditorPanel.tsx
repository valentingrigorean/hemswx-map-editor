import { useMemo } from 'preact/hooks';
import { useComputed } from '@preact/signals';
import { jsonData, updateJsonData } from '../lib/jsonStore';
import { SUPPORTED_LANGUAGES } from '../lib/intl';

interface TranslationEditorPanelProps {
  selectedKey: string | null;
}

export default function TranslationEditorPanel({ selectedKey }: TranslationEditorPanelProps) {
  const data = useComputed(() => jsonData.value);

  const translationData = useMemo(() => {
    if (!selectedKey) return null;
    
    const translations: { [lang: string]: string } = {};
    SUPPORTED_LANGUAGES.forEach(lang => {
      translations[lang] = data.value.intl?.[lang]?.[selectedKey] ?? '';
    });
    
    return translations;
  }, [selectedKey, data.value]);

  const missingTranslations = useMemo(() => {
    if (!translationData) return [];
    
    return SUPPORTED_LANGUAGES.filter(lang => 
      translationData[lang] === undefined || translationData[lang] === ''
    );
  }, [translationData]);

  const handleTranslationChange = (lang: string, value: string) => {
    if (!selectedKey) return;
    
    const updated = { ...data.value, intl: { ...data.value.intl } } as any;
    updated.intl[lang] = { ...(updated.intl[lang] || {}), [selectedKey]: value };
    updateJsonData(updated);
  };

  const fillMissingFromEnglish = () => {
    if (!selectedKey || !translationData) return;
    
    const englishValue = translationData.en;
    if (!englishValue) return;
    
    const updated = { ...data.value, intl: { ...data.value.intl } } as any;
    
    missingTranslations.forEach(lang => {
      if (!updated.intl[lang]) updated.intl[lang] = {};
      updated.intl[lang][selectedKey] = englishValue;
    });
    
    updateJsonData(updated);
  };

  const clearAllTranslations = () => {
    if (!selectedKey || !confirm('Are you sure you want to clear all translations for this key?')) return;
    
    const updated = { ...data.value, intl: { ...data.value.intl } } as any;
    
    SUPPORTED_LANGUAGES.forEach(lang => {
      if (updated.intl[lang] && updated.intl[lang][selectedKey]) {
        delete updated.intl[lang][selectedKey];
      }
    });
    
    updateJsonData(updated);
  };

  if (!selectedKey) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-slate-200 mb-2">Translation Editor</h3>
          <p className="text-slate-500 text-sm">Select a translation key from the left panel to edit its translations.</p>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <div className="text-6xl mb-4">🌐</div>
            <div className="text-lg font-medium mb-2">No Key Selected</div>
            <div className="text-sm">Choose a translation key to start editing</div>
          </div>
        </div>
      </div>
    );
  }

  if (!translationData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-slate-500">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-lg font-medium mb-2">Error Loading Translations</div>
          <div className="text-sm">Unable to load translation data for this key</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-slate-200 mb-1">Translation Editor</h3>
        <div className="flex items-center gap-2">
          <code className="inline text-slate-400">{selectedKey}</code>
          {missingTranslations.length > 0 && (
            <span className="pill warn">
              {missingTranslations.length} missing
            </span>
          )}
          {missingTranslations.length === 0 && (
            <span className="pill ok">
              Complete
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {missingTranslations.length > 0 && translationData.en && (
          <button 
            className="btn small"
            onClick={fillMissingFromEnglish}
          >
            Fill missing from EN
          </button>
        )}
        <button 
          className="btn danger small"
          onClick={clearAllTranslations}
        >
          Clear all
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {SUPPORTED_LANGUAGES.map(lang => (
            <div key={lang} className="form-group">
              <label className="form-label flex items-center gap-2">
                <span className="font-mono text-xs bg-slate-700 px-2 py-1 rounded">
                  {lang.toUpperCase()}
                </span>
                {lang === 'en' && <span className="text-slate-500 text-xs">(Default)</span>}
                {missingTranslations.includes(lang) && (
                  <span className="text-yellow-500 text-xs">• Missing</span>
                )}
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                value={translationData[lang]}
                onInput={(e) => handleTranslationChange(lang, (e.target as HTMLTextAreaElement).value)}
                placeholder={`Enter ${lang.toUpperCase()} translation for "${selectedKey}"`}
              />
              {lang === 'en' && translationData[lang] && (
                <div className="form-help">
                  This will be used as fallback for missing translations
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="text-xs text-slate-500">
          <div className="mb-1">
            <strong>Translation Status:</strong> {SUPPORTED_LANGUAGES.length - missingTranslations.length}/{SUPPORTED_LANGUAGES.length} languages
          </div>
          {missingTranslations.length > 0 && (
            <div>
              <strong>Missing:</strong> {missingTranslations.map(lang => lang.toUpperCase()).join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}