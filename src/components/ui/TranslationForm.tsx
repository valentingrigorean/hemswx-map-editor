import { h } from 'preact';
import { useComputed } from '@preact/signals';
import { jsonData, updateJsonData } from '../../lib/jsonStore';
import { isNonTranslatableKey, toggleNonTranslatableKey } from '../../lib/settings';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../lib/intl';

interface TranslationFormProps {
  translationKey: string | undefined;
  label?: string;
  hint?: string;
}

export default function TranslationForm({ translationKey, label, hint }: TranslationFormProps) {
  const data = useComputed(() => jsonData.value);

  if (!translationKey?.trim()) {
    return (
      <div className="p-4 text-center border border-amber-600/50 rounded bg-amber-900/20">
        <span className="text-amber-400 font-medium">Please set an ID to add translations.</span>
      </div>
    );
  }

  const isLocked = isNonTranslatableKey(translationKey);

  const updateTranslation = (lang: SupportedLanguage, value: string) => {
    const updated = JSON.parse(JSON.stringify(data.value));
    if (!updated.intl) {
      updated.intl = { en: {}, da: {}, nb: {}, sv: {} };
    }
    if (!updated.intl[lang]) {
      updated.intl[lang] = {};
    }
    updated.intl[lang][translationKey] = value;
    updateJsonData(updated);
  };

  return (
    <div className="space-y-4">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-4">
        <div>
          {label && <div className="text-sm font-medium text-slate-300">{label}</div>}
          {hint && <div className="text-xs text-slate-500">{hint}</div>}
        </div>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <span className={`text-xs ${isLocked ? 'text-slate-500' : 'text-blue-400 font-medium'}`}>
            {isLocked ? 'Translations Disabled' : 'Translations Enabled'}
          </span>
          <div className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={!isLocked}
              onChange={() => toggleNonTranslatableKey(translationKey)}
            />
            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </div>
        </label>
      </div>

      {isLocked ? (
        <div className="p-6 text-center border border-dashed border-slate-700 rounded bg-slate-800/30">
          <div className="text-2xl mb-2">🔒</div>
          <div className="text-slate-400 font-medium mb-1">Non-Translatable</div>
          <p className="text-xs text-slate-500">
            This item uses its internal ID or name for display. 
            Enable translations to provide localized strings.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {SUPPORTED_LANGUAGES.map(lang => {
            const langName = lang === 'en' ? 'English' : lang === 'da' ? 'Danish' : lang === 'nb' ? 'Norwegian' : 'Swedish';
            return (
              <div key={lang} className="form-group">
                <label className="form-label text-xs">
                  <span className="uppercase font-medium text-slate-400">{lang}</span>
                  {' '}
                  <span className="text-slate-500 font-normal">{langName}</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={data.value.intl?.[lang]?.[translationKey] || ''}
                  onChange={(e) => updateTranslation(lang, (e.target as HTMLInputElement).value)}
                  placeholder={`Enter ${langName} translation`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
