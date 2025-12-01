import { useMemo } from 'preact/hooks';
import { useComputed, useSignal } from '@preact/signals';
import { jsonData, syncMissingTranslations } from '../lib/jsonStore';
import { SUPPORTED_LANGUAGES } from '../lib/intl';
import { collectItemIds } from '../lib/utils';
import { isNonTranslatableKey } from '../lib/settings';

interface TranslationKeyItemProps {
  translationKey: string;
  isSelected: boolean;
  onSelect: () => void;
}

function TranslationKeyItem({ translationKey, isSelected, onSelect }: TranslationKeyItemProps) {
  const data = useComputed(() => jsonData.value);
  const isNonTranslatable = isNonTranslatableKey(translationKey);

  // Count missing translations for this key
  const missingCount = useMemo(() => {
    return SUPPORTED_LANGUAGES.reduce((count, lang) => {
      const value = data.value.intl?.[lang]?.[translationKey];
      return count + (value === undefined || value === '' ? 1 : 0);
    }, 0);
  }, [translationKey, data.value]);

  const hasTranslations = useMemo(() => {
    return SUPPORTED_LANGUAGES.some(lang => {
      const value = data.value.intl?.[lang]?.[translationKey];
      return value !== undefined && value !== '';
    });
  }, [translationKey, data.value]);

  return (
    <div
      className={`feature-list-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="feature-info">
        <div className="feature-name">{translationKey}</div>
        <div className="feature-details">
          {isNonTranslatable ? (
            'Uses item name directly'
          ) : (
            <>
              {SUPPORTED_LANGUAGES.length - missingCount}/{SUPPORTED_LANGUAGES.length} languages
              {missingCount > 0 && ` • ${missingCount} missing`}
              {!hasTranslations && ' • No translations'}
            </>
          )}
        </div>
      </div>
      <div className="feature-actions">
        {isNonTranslatable ? (
          <span className="pill" style={{ background: '#475569' }}>
            🔒
          </span>
        ) : (
          <>
            {missingCount > 0 && (
              <span className="pill warn">
                Missing {missingCount}
              </span>
            )}
            {!hasTranslations && (
              <span className="pill bad">
                Empty
              </span>
            )}
            {missingCount === 0 && hasTranslations && (
              <span className="pill ok">
                Complete
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface TranslationCategoryProps {
  title: string;
  keys: string[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
}

function TranslationCategory({ title, keys, selectedKey, onSelectKey }: TranslationCategoryProps) {
  return (
    <details open className="feature-category">
      <summary className="feature-category-header">{title}</summary>
      <div className="feature-category-content">
        {keys.length === 0 ? (
          <div className="p-3 text-slate-500 text-center">
            No {title.toLowerCase()} found
          </div>
        ) : (
          keys.map((key) => (
            <TranslationKeyItem 
              key={key}
              translationKey={key}
              isSelected={selectedKey === key}
              onSelect={() => onSelectKey(key)}
            />
          ))
        )}
      </div>
    </details>
  );
}

interface TranslationKeysBrowserProps {
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
}

export default function TranslationKeysBrowser({ selectedKey, onSelectKey }: TranslationKeysBrowserProps) {
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

  // Categorize keys by prefix
  const categorizedKeys = useMemo(() => {
    const categories: { [key: string]: string[] } = {
      'Weather Features': [],
      'General Features': [],
      'Layers': [],
      'Other': []
    };

    filteredKeys.forEach(key => {
      // Simple categorization based on common prefixes
      if (key.includes('weather') || key.includes('radar') || key.includes('wind') || key.includes('cloud')) {
        categories['Weather Features'].push(key);
      } else if (key.includes('layer') || key.includes('overlay')) {
        categories['Layers'].push(key);
      } else if (key.includes('feature') || key.includes('item')) {
        categories['General Features'].push(key);
      } else {
        categories['Other'].push(key);
      }
    });

    return categories;
  }, [filteredKeys]);

  if (keys.length === 0) {
    return (
      <div>
        <div className="mb-3">
          <button className="btn primary" disabled>
            No Translation Keys Found
          </button>
        </div>
        <div className="p-4 text-center text-slate-500">
          Load a JSON file with translation keys to get started
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <button className="btn primary" onClick={syncMissingTranslations}>
          🌐 Fill Missing from EN
        </button>
      </div>

      <div className="flex flex-col gap-2 items-stretch mb-3">
        <input
          type="text"
          className="form-input"
          placeholder="Search keys or translations…"
          value={query.value}
          onInput={(e) => (query.value = (e.target as HTMLInputElement).value)}
        />
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={showMissingOnly.value}
              onChange={(e) => (showMissingOnly.value = (e.target as HTMLInputElement).checked)}
            />
            Show missing only
          </label>
          <select
            className="form-select text-xs flex-1"
            value={missingLang.value}
            onChange={(e) => (missingLang.value = (e.target as HTMLSelectElement).value as any)}
          >
            <option value="any">Any language</option>
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l} value={l}>{l.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="feature-browser">
        {Object.entries(categorizedKeys).map(([category, categoryKeys]) => 
          categoryKeys.length > 0 && (
            <TranslationCategory
              key={category}
              title={category}
              keys={categoryKeys}
              selectedKey={selectedKey}
              onSelectKey={onSelectKey}
            />
          )
        )}
      </div>
    </div>
  );
}