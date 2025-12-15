import { useSignal, useComputed } from '@preact/signals';
import { useState, useEffect } from 'preact/hooks';
import { jsonData, updateJsonData } from '../../lib/jsonStore';
import { MapFeature, MapLayerItem, LayerEntry } from '../../lib/types';
import { upsertLayerEntry } from '../../lib/layers';
import { validateFeature } from '../../lib/validation';
import { isNonTranslatableKey, toggleNonTranslatableKey } from '../../lib/settings';
import ValidationDisplay from '../ValidationDisplay';
import SmartLayerSelect from '../ui/SmartLayerSelect';
import Tabs from '../ui/Tabs';
import TranslationForm from '../ui/TranslationForm';
import QuickLayerModal from './QuickLayerModal';
import LayerEditorModal from './LayerEditorModal';

interface FeatureCreatorModalProps {
  isOpen: boolean;
  initialFeatureType: 'weatherFeatures' | 'features';
  onClose: () => void;
  onCreate: (feature: MapFeature, featureType: 'weatherFeatures' | 'features') => void;
}

function createEmptyFeature(): MapFeature {
  return {
    presentation: 'single',
    items: [{ id: '', name: '', showLegend: false, layersIds: [] }]
  };
}

export default function FeatureCreatorModal({
  isOpen,
  initialFeatureType,
  onClose,
  onCreate
}: FeatureCreatorModalProps) {
  const feature = useSignal<MapFeature>(createEmptyFeature());
  const featureType = useSignal<'weatherFeatures' | 'features'>(initialFeatureType);
  const selectedItemIndex = useSignal<number | undefined>(undefined);
  const layerCreatorItemIndex = useSignal<number | null>(null);
  const editingLayerId = useSignal<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'items' | 'translations'>('general');

  const layers = useComputed(() => jsonData.value.layers || []);
  const validation = useComputed(() => validateFeature(feature.value));

  useEffect(() => {
    if (isOpen) {
      feature.value = createEmptyFeature();
      featureType.value = initialFeatureType;
      selectedItemIndex.value = undefined;
      setActiveTab('general');
    }
  }, [isOpen, initialFeatureType]);

  if (!isOpen) return null;

  const updateFeature = (changes: Partial<MapFeature>) => {
    feature.value = { ...feature.value, ...changes };
  };

  const updateItem = (index: number, changes: Partial<MapLayerItem>) => {
    const items = [...feature.value.items];
    items[index] = { ...items[index], ...changes };
    feature.value = { ...feature.value, items };
  };

  const removeItem = (index: number) => {
    const items = [...feature.value.items];
    items.splice(index, 1);
    feature.value = { ...feature.value, items };
    if (selectedItemIndex.value === index) {
      selectedItemIndex.value = undefined;
    }
  };

  const addItem = () => {
    const items = [...feature.value.items, { id: '', name: '', showLegend: false, layersIds: [] }];
    feature.value = { ...feature.value, items };
    selectedItemIndex.value = items.length - 1;
  };

  const handleCreate = () => {
    if (!validation.value.valid) return;
    onCreate(feature.value, featureType.value);
  };

  const handleQuickCreateLayer = (newLayer: LayerEntry) => {
    // Save layer to store
    const updated = upsertLayerEntry(jsonData.value, newLayer);
    updateJsonData(updated);

    // Assign to item
    if (layerCreatorItemIndex.value !== null) {
      const items = [...feature.value.items];
      const item = items[layerCreatorItemIndex.value];
      if (!item.layersIds) item.layersIds = [];
      if (!item.layersIds.includes(newLayer.id)) {
        item.layersIds = [...item.layersIds, newLayer.id];
      }
      feature.value = { ...feature.value, items };
    }
    layerCreatorItemIndex.value = null;
  };

  const currentItem = selectedItemIndex.value !== undefined ? feature.value.items[selectedItemIndex.value] : null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-600 rounded-xl w-[700px] max-w-[95vw] max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-white">
              {currentItem ? (currentItem.name || currentItem.id || 'Edit Item') : 'New Feature'}
            </h3>
            {currentItem && (
              <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
                Item {(selectedItemIndex.value ?? 0) + 1}
              </span>
            )}
          </div>
          <button
            className="text-slate-400 hover:text-white text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Validation Errors */}
        {!validation.value.valid && (
          <div className="px-4 pt-3 flex-shrink-0">
            <ValidationDisplay validation={validation.value} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {currentItem ? (
            // Item Edit View
            <div className="space-y-4">
              <button
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                onClick={() => selectedItemIndex.value = undefined}
              >
                ← Back to Feature
              </button>

              <Tabs
                tabs={[
                  { id: 'general', label: 'General' },
                  { id: 'appearance', label: 'Appearance' },
                  { id: 'translations', label: 'Translations' }
                ]}
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as any)}
              />

              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label flex items-center gap-2">
                        Item ID
                        {currentItem.id && (
                          <button
                            type="button"
                            className="text-xs px-1 hover:bg-slate-700 rounded"
                            onClick={() => toggleNonTranslatableKey(currentItem.id!)}
                            title={isNonTranslatableKey(currentItem.id) ? 'Click to enable translations' : 'Click to mark as non-translatable'}
                          >
                            {isNonTranslatableKey(currentItem.id) ? '🔒' : '🔓'}
                          </button>
                        )}
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={currentItem.id || ''}
                        onInput={(e) => updateItem(selectedItemIndex.value!, { id: (e.target as HTMLInputElement).value })}
                        placeholder="unique_item_id"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Item Name (Internal)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={currentItem.name || ''}
                        onInput={(e) => updateItem(selectedItemIndex.value!, { name: (e.target as HTMLInputElement).value })}
                        placeholder="Display Name"
                      />
                    </div>
                  </div>

                  {/* Layer Assignment */}
                  <div className="form-group">
                    <label className="form-label text-xs">
                      Assigned Layers
                      {(currentItem.layersIds?.length || 0) === 0 && (
                        <span className="text-red-400 ml-1">(required)</span>
                      )}
                    </label>

                    <div className="space-y-1 mb-2">
                      {(currentItem.layersIds || []).map((layerId, layerIdx) => (
                        <div key={layerIdx} className="flex items-center gap-1">
                          <button
                            className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors bg-slate-700 hover:bg-slate-600"
                            onClick={() => editingLayerId.value = layerId}
                          >
                            <span className="flex-1 text-blue-400 font-mono">{layerId}</span>
                            <span className="text-[10px] text-slate-500">click to edit</span>
                          </button>
                          <button
                            className="px-2 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
                            onClick={() => {
                              const layersIds = [...(currentItem.layersIds || [])];
                              layersIds.splice(layerIdx, 1);
                              updateItem(selectedItemIndex.value!, { layersIds });
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <SmartLayerSelect
                      value={undefined}
                      onChange={(layerId) => {
                        updateItem(selectedItemIndex.value!, {
                          layersIds: [...(currentItem.layersIds || []), layerId]
                        });
                      }}
                      excludeIds={currentItem.layersIds || []}
                      placeholder="+ Add Layer..."
                    />

                    <div className="mt-2 text-right">
                      <button
                        className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                        onClick={() => layerCreatorItemIndex.value = selectedItemIndex.value!}
                      >
                        or create new layer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-4">
                  <div className="form-group">
                    <label className="flex items-center gap-2 cursor-pointer p-3 border border-slate-700 rounded-lg bg-slate-800/50">
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={currentItem.showLegend || false}
                        onChange={(e) => updateItem(selectedItemIndex.value!, { showLegend: (e.target as HTMLInputElement).checked })}
                      />
                      <div>
                        <span className="text-sm font-medium text-slate-200 block">Show Legend</span>
                        <span className="text-xs text-slate-500">Display this item in the legend panel</span>
                      </div>
                    </label>
                  </div>

                  {currentItem.showLegend && (
                    <div className="space-y-3 pl-1">
                      <p className="text-xs text-slate-500 mb-3">
                        Leave empty to use ArcGIS API legend info automatically.
                      </p>
                      <div className="form-group">
                        <label className="form-label">
                          Legend URL <span className="text-slate-500 font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={currentItem.legendUrl || ''}
                          onInput={(e) => updateItem(selectedItemIndex.value!, { legendUrl: (e.target as HTMLInputElement).value })}
                          placeholder="Custom legend image URL"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          Legend Description Key <span className="text-slate-500 font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={currentItem.legendDescription || ''}
                          onInput={(e) => updateItem(selectedItemIndex.value!, { legendDescription: (e.target as HTMLInputElement).value })}
                          placeholder="i18n key for description"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'translations' && (
                <div className="space-y-6">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <TranslationForm
                      translationKey={currentItem.id}
                      label={`Name Translations (ID: ${currentItem.id || 'none'})`}
                    />
                  </div>

                  {currentItem.legendDescription && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <TranslationForm
                        translationKey={currentItem.legendDescription}
                        label={`Legend Description (ID: ${currentItem.legendDescription})`}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Feature Edit View
            <div className="space-y-4">
              {/* Feature Type Selector */}
              <div className="form-group">
                <label className="form-label">Feature Type</label>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 px-3 py-2 rounded text-sm ${
                      featureType.value === 'weatherFeatures'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    onClick={() => featureType.value = 'weatherFeatures'}
                  >
                    Weather Feature
                  </button>
                  <button
                    className={`flex-1 px-3 py-2 rounded text-sm ${
                      featureType.value === 'features'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    onClick={() => featureType.value = 'features'}
                  >
                    General Feature
                  </button>
                </div>
              </div>

              <Tabs
                tabs={[
                  { id: 'general', label: 'General' },
                  { id: 'items', label: 'Items' },
                  { id: 'translations', label: 'Translations' }
                ]}
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as any)}
              />

              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label flex items-center gap-2">
                        Feature ID
                        {feature.value.id && (
                          <button
                            type="button"
                            className="text-xs px-1 hover:bg-slate-700 rounded"
                            onClick={() => toggleNonTranslatableKey(feature.value.id!)}
                            title={isNonTranslatableKey(feature.value.id) ? 'Click to enable translations' : 'Click to mark as non-translatable'}
                          >
                            {isNonTranslatableKey(feature.value.id) ? '🔒' : '🔓'}
                          </button>
                        )}
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={feature.value.id || ''}
                        onInput={(e) => updateFeature({ id: (e.target as HTMLInputElement).value })}
                        placeholder="e.g. icing_index"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Feature Name (Internal)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={feature.value.name || ''}
                        onInput={(e) => updateFeature({ name: (e.target as HTMLInputElement).value })}
                        placeholder="e.g. Icing Index"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label">Presentation</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'single', label: 'Single (Radio)' },
                          { value: 'multiple', label: 'Multiple (Checkbox)' }
                        ].map(opt => {
                          const isSelected = (feature.value.presentation || 'single') === opt.value;
                          return (
                            <button
                              key={opt.value}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                  : 'bg-transparent text-slate-300 border-slate-600 hover:border-slate-500'
                              }`}
                              onClick={() => updateFeature({ presentation: opt.value as 'single' | 'multiple' })}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {feature.value.presentation === 'multiple' && (
                      <div className="form-group flex items-center mt-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={feature.value.mutuallyExclusive || false}
                            onChange={(e) => updateFeature({ mutuallyExclusive: (e.target as HTMLInputElement).checked })}
                          />
                          <span className="text-sm text-slate-300">Mutually Exclusive</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'items' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-slate-300">Feature Items</h4>
                    <button className="btn tiny primary" onClick={addItem}>
                      + Add Item
                    </button>
                  </div>

                  {feature.value.items.map((item, idx) => {
                    const hasErrors = !item.id || !item.name || (item.layersIds?.length || 0) === 0;
                    return (
                      <div
                        key={idx}
                        className={`border rounded-lg p-3 bg-slate-800/50 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors ${
                          hasErrors ? 'border-red-600/50' : 'border-slate-600'
                        }`}
                        onClick={() => selectedItemIndex.value = idx}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-slate-200 flex items-center gap-2">
                            {item.name || item.id || '(unnamed)'}
                            {hasErrors && <span className="text-red-400 text-xs">incomplete</span>}
                          </div>
                          <div className="text-xs text-slate-500">{item.layersIds?.length || 0} layers</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="btn tiny"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectedItemIndex.value = idx;
                            }}
                          >
                            Edit
                          </button>
                          {feature.value.items.length > 1 && (
                            <button
                              className="btn tiny danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeItem(idx);
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {feature.value.items.length === 0 && (
                    <div className="text-center py-4 border border-dashed border-slate-600 rounded">
                      <p className="text-slate-500 text-sm mb-2">No items defined</p>
                      <button className="btn small primary" onClick={addItem}>
                        Add First Item
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'translations' && (
                <div className="space-y-6">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <TranslationForm
                      translationKey={feature.value.id}
                      label={`Feature Name Translations (ID: ${feature.value.id || 'none'})`}
                    />
                  </div>

                  {feature.value.items.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-slate-400 border-b border-slate-700 pb-2">Item Translations</h4>
                      {feature.value.items.map((item, idx) => (
                        <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                          <div className="text-xs text-slate-500 mb-3">
                            Item: {item.name || item.id || `#${idx + 1}`}
                            {!item.id && <span className="text-amber-400 ml-2">(no ID set)</span>}
                          </div>
                          <TranslationForm
                            translationKey={item.id}
                            label={`Name (ID: ${item.id || 'none'})`}
                          />
                          {item.legendDescription && (
                            <div className="mt-4 pt-4 border-t border-slate-700">
                              <TranslationForm
                                translationKey={item.legendDescription}
                                label={`Legend Description (ID: ${item.legendDescription})`}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex gap-2 justify-end flex-shrink-0">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn success"
            onClick={handleCreate}
            disabled={!validation.value.valid}
          >
            Create Feature
          </button>
        </div>
      </div>

      {/* Sub-modals */}
      <QuickLayerModal
        isOpen={layerCreatorItemIndex.value !== null}
        onClose={() => layerCreatorItemIndex.value = null}
        onCreateLayer={handleQuickCreateLayer}
      />

      <LayerEditorModal
        layerId={editingLayerId.value}
        onClose={() => editingLayerId.value = null}
      />
    </div>
  );
}
