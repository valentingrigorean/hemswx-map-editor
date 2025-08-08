import { useMemo } from 'preact/hooks';
import { useComputed, useSignal } from '@preact/signals';
import { jsonData, updateJsonData, syncMissingTranslations } from '../lib/jsonStore';
import { SUPPORTED_LANGUAGES } from '../lib/intl';
import { collectItemIds } from '../lib/utils';

export default function I18nTable() {
  const data = useComputed(() => jsonData.value);
  const query = useSignal('');
  const showMissingOnly = useSignal(false);
  const missingLang = useSignal<'any' | typeof SUPPORTED_LANGUAGES[number]>('any');

  const keys = useMemo(() => {
    try {
      return [...collectItemIds(data.value)].sort();
    } catch {
      return [] as string[];
    }
  }, [data.value]);

  const filteredKeys = useMemo(() => {
    const q = query.value.toLowerCase().trim();
    const langFilter = missingLang.value;
    const isMissing = (k: string, lang: string) => {
      const v = data.value.intl?.[lang]?.[k];
      return v === undefined || v === '';
    };
    return keys.filter((k) => {
      if (q) {
        const inKey = k.toLowerCase().includes(q);
        const inValues = SUPPORTED_LANGUAGES.some((l) => (data.value.intl?.[l]?.[k] || '').toLowerCase().includes(q));
        if (!inKey && !inValues) return false;
      }
      if (showMissingOnly.value) {
        if (langFilter === 'any') {
          if (!SUPPORTED_LANGUAGES.some((l) => isMissing(k, l))) return false;
        } else {
          if (!isMissing(k, langFilter)) return false;
        }
      }
      return true;
    });
  }, [keys, query.value, showMissingOnly.value, missingLang.value, data.value]);

  const handleChange = (key: string, lang: string, value: string) => {
    const updated = { ...data.value, intl: { ...data.value.intl } } as any;
    updated.intl[lang] = { ...(updated.intl[lang] || {}), [key]: value };
    updateJsonData(updated);
  };

  if (keys.length === 0) {
    return <div className="p-4 text-center text-slate-500">No translation keys found</div>;
  }

  return (
    <div>
      <div className="flex gap-2 items-center mb-3">
        <button className="btn small" onClick={syncMissingTranslations}>
          Fill missing from EN
        </button>
        <input
          type="text"
          className="form-input"
          placeholder="Search keys or translations…"
          value={query.value}
          onInput={(e) => (query.value = (e.target as HTMLInputElement).value)}
        />
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={showMissingOnly.value}
            onChange={(e) => (showMissingOnly.value = (e.target as HTMLInputElement).checked)}
          />
          Show missing only
        </label>
        <select
          className="form-select text-xs"
          value={missingLang.value}
          onChange={(e) => (missingLang.value = (e.target as HTMLSelectElement).value as any)}
        >
          <option value="any">Any language</option>
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l} value={l}>{l.toUpperCase()}</option>
          ))}
        </select>
      </div>
      <div className="overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 border-b border-slate-700 sticky top-0 bg-slate-800">Key</th>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <th key={lang} className="text-left p-2 border-b border-slate-700 sticky top-0 bg-slate-800">
                {lang.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredKeys.map((key) => (
            <tr key={key} className="align-top">
              <td className="p-2 border-b border-slate-800 text-slate-300 whitespace-nowrap">{key}</td>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <td key={lang} className="p-2 border-b border-slate-800 min-w-[220px]">
                  <input
                    type="text"
                    className="form-input w-full"
                    value={data.value.intl?.[lang]?.[key] ?? ''}
                    onInput={(e) => handleChange(key, lang, (e.target as HTMLInputElement).value)}
                    placeholder={`[${lang}] ${key}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
