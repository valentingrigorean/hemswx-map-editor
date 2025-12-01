import { useComputed, useSignal } from '@preact/signals';
import { jsonData, updateJsonData, navigateToTranslation } from '../../lib/jsonStore';
import { MapFeature, MapLayerItem, LayerEntry } from '../../lib/types';
import { validateFeature } from '../../lib/validation';
import { isNonTranslatableKey } from '../../lib/settings';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../lib/intl';
import CollapsibleSection from '../ui/CollapsibleSection';
import ValidationDisplay from '../ValidationDisplay';
import LayerPicker from './LayerPicker';
import LayerEditorModal from './LayerEditorModal';

function TranslationBadge({ translationKey, onClick }: { translationKey: string; onClick?: () => void }) {
  const data = useComputed(() => jsonData.value);

  if (!translationKey?.trim()) {
    return null;
  }

  if (isNonTranslatableKey(translationKey)) {
    return (
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-600 text-slate-300 cursor-pointer hover:bg-slate-500 transition-colors"
        title="Non-translatable key - click to edit"
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick();
          else navigateToTranslation(translationKey);
        }}
      >
        🔒
      </span>
    );
  }

  let completed = 0;
  SUPPORTED_LANGUAGES.forEach(lang => {
    if (data.value.intl?.[lang]?.[translationKey]?.trim()) completed++;
  });

  const percent = Math.round((completed / SUPPORTED_LANGUAGES.length) * 100);
  const color = percent === 100 ? 'bg-green-600' : percent > 50 ? 'bg-yellow-600' : 'bg-red-600';

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${color} text-white cursor-pointer hover:opacity-80`}
      title={`${completed}/${SUPPORTED_LANGUAGES.length} translations - click to edit`}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
        else navigateToTranslation(translationKey);
      }}
    >
      {percent}%
    </span>
  );
}

interface TranslationEditorModalProps {
  translationKey: string | null;
  onClose: () => void;
}

function TranslationEditorModal({ translationKey, onClose }: TranslationEditorModalProps) {
  const data = useComputed(() => jsonData.value);

  if (!translationKey) return null;

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-600 rounded-xl w-[500px] max-w-[95vw] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">Edit Translations</h3>
            <div className="text-sm text-blue-400 mt-0.5">{translationKey}</div>
          </div>
          <button
            className="text-slate-400 hover:text-white text-xl leading-none px-2"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {SUPPORTED_LANGUAGES.map(lang => (
            <div key={lang} className="form-group">
              <label className="form-label text-xs flex items-center gap-2">
                <span className="uppercase font-medium w-6">{lang}</span>
                <span className="text-slate-500">
                  {lang === 'en' ? 'English' : lang === 'da' ? 'Danish' : lang === 'nb' ? 'Norwegian' : 'Swedish'}
                </span>
              </label>
              <input
                type="text"
                className="form-input"
                value={data.value.intl?.[lang]?.[translationKey] || ''}
                onChange={(e) => updateTranslation(lang, (e.target as HTMLInputElement).value)}
                placeholder={`Enter ${lang.toUpperCase()} translation`}
                autoFocus={lang === 'en'}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end">
          <button className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function TranslationEditButton({ translationKey, onClick }: { translationKey: string; onClick: () => void }) {
  if (!translationKey?.trim()) return null;

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Edit translations"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      i18n
    </button>
  );
}

interface LayerAssignmentProps {
  item: MapLayerItem;
  itemIndex: number;
  layers: LayerEntry[];
  onUpdateItem: (index: number, changes: Partial<MapLayerItem>) => void;
  onOpenLayerCreator: (itemIndex: number) => void;
  onOpenLayerEditor: (layerId: string) => void;
}

function LayerAssignment({
  item,
  itemIndex,
  layers,
  onUpdateItem,
  onOpenLayerCreator,
  onOpenLayerEditor
}: LayerAssignmentProps) {
  return (
    <div className="form-group mt-3">
      <label className="form-label text-xs">
        Assigned Layers
        {(item.layersIds?.length || 0) === 0 && (
          <span className="text-red-400 ml-1">(required)</span>
        )}
      </label>

      <div className="space-y-1 mb-2">
        {(item.layersIds || []).map((layerId, layerIdx) => (
          <div key={layerIdx} className="flex items-center gap-1">
            <button
              className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors bg-slate-700 hover:bg-slate-600"
              onClick={() => onOpenLayerEditor(layerId)}
            >
              <span className="flex-1 text-blue-400">{layerId}</span>
              <span className="text-[10px] text-slate-500">click to edit</span>
            </button>
            <button
              className="px-2 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
              onClick={(e) => {
                e.stopPropagation();
                const layersIds = [...(item.layersIds || [])];
                layersIds.splice(layerIdx, 1);
                onUpdateItem(itemIndex, { layersIds });
              }}
            >
              ×
            </button>
          </div>
        ))}
        {(item.layersIds?.length || 0) === 0 && (
          <span className="text-slate-500 text-xs">No layers assigned</span>
        )}
      </div>

      <LayerPicker
        layers={layers}
        excludeIds={item.layersIds || []}
        data={jsonData.value}
        onSelect={(layerId) => {
          onUpdateItem(itemIndex, {
            layersIds: [...(item.layersIds || []), layerId]
          });
        }}
        onCreateNew={() => onOpenLayerCreator(itemIndex)}
      />
    </div>
  );
}

interface FeatureEditorProps {
  feature: MapFeature;
  featureType: 'weatherFeatures' | 'features';
  isNew: boolean;
  onUpdate: (changes: Partial<MapFeature>) => void;
  onUpdateItem: (index: number, changes: Partial<MapLayerItem>) => void;
  onRemoveItem: (index: number, item: MapLayerItem) => void;
  onFeatureTypeChange?: (type: 'weatherFeatures' | 'features') => void;
  onOpenLayerCreator: (itemIndex: number) => void;
}

export default function FeatureEditor({
  feature,
  featureType,
  isNew,
  onUpdate,
  onUpdateItem,
  onRemoveItem,
  onFeatureTypeChange,
  onOpenLayerCreator
}: FeatureEditorProps) {
  const layers = useComputed(() => jsonData.value.layers || []);
  const validation = useComputed(() => validateFeature(feature));
  const editingLayerId = useSignal<string | null>(null);
  const editingTranslationKey = useSignal<string | null>(null);

  return (
    <div className="space-y-4">
      <ValidationDisplay validation={validation.value} className="mb-4" />

      {/* Feature Type Selector (only for new) */}
      {isNew && onFeatureTypeChange && (
        <div className="form-group">
          <label className="form-label">Feature Type</label>
          <div className="flex gap-2">
            <button
              className={`flex-1 px-3 py-2 rounded text-sm ${
                featureType === 'weatherFeatures'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              onClick={() => onFeatureTypeChange('weatherFeatures')}
            >
              Weather Feature
            </button>
            <button
              className={`flex-1 px-3 py-2 rounded text-sm ${
                featureType === 'features'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              onClick={() => onFeatureTypeChange('features')}
            >
              General Feature
            </button>
          </div>
        </div>
      )}

      {/* Basic Info */}
      <CollapsibleSection title="Basic Information" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-3">
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              Feature ID
              <TranslationBadge translationKey={feature.id || ''} />
              <TranslationEditButton
                translationKey={feature.id || ''}
                onClick={() => editingTranslationKey.value = feature.id || null}
              />
            </label>
            <input
              type="text"
              className="form-input"
              value={feature.id || ''}
              onChange={(e) => onUpdate({ id: (e.target as HTMLInputElement).value })}
              placeholder="e.g. icing_index"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Feature Name</label>
            <input
              type="text"
              className="form-input"
              value={feature.name || ''}
              onChange={(e) => onUpdate({ name: (e.target as HTMLInputElement).value })}
              placeholder="e.g. Icing Index"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="form-group">
            <label className="form-label">Presentation</label>
            <select
              className="form-select"
              value={feature.presentation || 'single'}
              onChange={(e) => onUpdate({ presentation: (e.target as HTMLSelectElement).value as 'single' | 'multiple' })}
            >
              <option value="single">Single</option>
              <option value="multiple">Multiple</option>
            </select>
          </div>
          {feature.presentation === 'multiple' && (
            <div className="form-group flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={feature.mutuallyExclusive || false}
                  onChange={(e) => onUpdate({ mutuallyExclusive: (e.target as HTMLInputElement).checked })}
                />
                <span className="text-sm text-slate-300">Mutually Exclusive</span>
              </label>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Items */}
      <CollapsibleSection
        title="Items"
        badge={feature.items?.length || 0}
        actions={
          <button
            className="btn tiny primary"
            onClick={() => {
              const items = [...(feature.items || [])];
              items.push({ id: '', name: '', showLegend: false, layersIds: [] });
              onUpdate({ items });
            }}
          >
            + Item
          </button>
        }
      >
        {(feature.items || []).map((item, itemIndex) => (
          <div key={itemIndex} className="border border-slate-600 rounded-lg p-3 mb-3 bg-slate-800/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                Item #{itemIndex + 1}: {item.name || item.id || '(unnamed)'}
                <TranslationBadge translationKey={item.id || ''} />
              </span>
              {(feature.items?.length || 0) > 1 && (
                <button
                  className="btn tiny danger"
                  onClick={() => onRemoveItem(itemIndex, item)}
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label text-xs flex items-center gap-2">
                  Item ID
                  <TranslationEditButton
                    translationKey={item.id || ''}
                    onClick={() => editingTranslationKey.value = item.id || null}
                  />
                </label>
                <input
                  type="text"
                  className="form-input text-sm"
                  value={item.id || ''}
                  onChange={(e) => onUpdateItem(itemIndex, { id: (e.target as HTMLInputElement).value })}
                  placeholder="unique_item_id"
                />
              </div>
              <div className="form-group">
                <label className="form-label text-xs">Item Name</label>
                <input
                  type="text"
                  className="form-input text-sm"
                  value={item.name || ''}
                  onChange={(e) => onUpdateItem(itemIndex, { name: (e.target as HTMLInputElement).value })}
                  placeholder="Display Name"
                />
              </div>
            </div>

            {/* Layer Assignment */}
            <LayerAssignment
              item={item}
              itemIndex={itemIndex}
              layers={layers.value}
              onUpdateItem={onUpdateItem}
              onOpenLayerCreator={onOpenLayerCreator}
              onOpenLayerEditor={(layerId) => editingLayerId.value = layerId}
            />

            {/* Legend Options */}
            <div className="form-group mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={item.showLegend || false}
                  onChange={(e) => onUpdateItem(itemIndex, { showLegend: (e.target as HTMLInputElement).checked })}
                />
                <span className="text-sm text-slate-300">Show Legend</span>
              </label>
            </div>

            {item.showLegend && (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label className="form-label text-xs">Legend URL</label>
                    <input
                      type="text"
                      className="form-input text-sm"
                      value={item.legendUrl || ''}
                      onChange={(e) => onUpdateItem(itemIndex, { legendUrl: (e.target as HTMLInputElement).value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs flex items-center gap-2">
                      Legend Description Key
                      <TranslationBadge translationKey={item.legendDescription || ''} />
                      <TranslationEditButton
                        translationKey={item.legendDescription || ''}
                        onClick={() => editingTranslationKey.value = item.legendDescription || null}
                      />
                    </label>
                    <input
                      type="text"
                      className="form-input text-sm"
                      value={item.legendDescription || ''}
                      onChange={(e) => onUpdateItem(itemIndex, { legendDescription: (e.target as HTMLInputElement).value })}
                      placeholder="i18n.key"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {(feature.items?.length || 0) === 0 && (
          <div className="text-center py-4 border border-dashed border-slate-600 rounded">
            <p className="text-slate-500 text-sm mb-2">No items defined</p>
            <button
              className="btn small primary"
              onClick={() => {
                onUpdate({ items: [{ id: '', name: '', showLegend: false, layersIds: [] }] });
              }}
            >
              Add First Item
            </button>
          </div>
        )}
      </CollapsibleSection>

      {/* Layer Editor Modal */}
      <LayerEditorModal
        layerId={editingLayerId.value}
        onClose={() => editingLayerId.value = null}
      />

      {/* Translation Editor Modal */}
      <TranslationEditorModal
        translationKey={editingTranslationKey.value}
        onClose={() => editingTranslationKey.value = null}
      />
    </div>
  );
}
