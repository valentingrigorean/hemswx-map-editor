import { useComputed, useSignal } from '@preact/signals';
import { useState, useEffect, useRef } from 'preact/hooks';
import { jsonData } from '../../lib/jsonStore';
import { MapFeature, MapLayerItem, LayerEntry } from '../../lib/types';
import { validateFeature } from '../../lib/validation';
import { isNonTranslatableKey, toggleNonTranslatableKey } from '../../lib/settings';
import ValidationDisplay from '../ValidationDisplay';
import LayerEditorModal from './LayerEditorModal';
import SmartLayerSelect from '../ui/SmartLayerSelect';
import Tabs from '../ui/Tabs';
import ConfigHeader from '../ui/ConfigHeader';
import TranslationForm from '../ui/TranslationForm';

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
              <span className="flex-1 text-blue-400 font-mono">{layerId}</span>
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
      </div>

      <SmartLayerSelect
        value={undefined}
        onChange={(layerId) => {
          onUpdateItem(itemIndex, {
            layersIds: [...(item.layersIds || []), layerId]
          });
        }}
        excludeIds={item.layersIds || []}
        placeholder="+ Add Layer..."
      />
      
      <div className="mt-2 text-right">
         <button
          className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
          onClick={() => onOpenLayerCreator(itemIndex)}
        >
          or create new layer
        </button>
      </div>
    </div>
  );
}

interface FeatureEditorProps {
  feature: MapFeature;
  featureType: 'weatherFeatures' | 'features';
  isNew: boolean;
  selectedItemIndex?: number;
  onUpdate: (changes: Partial<MapFeature>) => void;
  onUpdateItem: (index: number, changes: Partial<MapLayerItem>) => void;
  onRemoveItem: (index: number, item: MapLayerItem) => void;
  onSelectItem: (index: number | undefined) => void;
  onFeatureTypeChange?: (type: 'weatherFeatures' | 'features') => void;
  onOpenLayerCreator: (itemIndex: number) => void;
}

export default function FeatureEditor({
  feature,
  featureType,
  isNew,
  selectedItemIndex,
  onUpdate,
  onUpdateItem,
  onRemoveItem,
  onSelectItem,
  onFeatureTypeChange,
  onOpenLayerCreator
}: FeatureEditorProps) {
  const layers = useComputed(() => jsonData.value.layers || []);
  const validation = useComputed(() => validateFeature(feature));
  const editingLayerId = useSignal<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'items' | 'translations'>('general');
  const prevSelectedItemIndex = useRef(selectedItemIndex);

  // Handle tab switching when context changes
  useEffect(() => {
    if (prevSelectedItemIndex.current !== selectedItemIndex) {
      if (selectedItemIndex !== undefined) {
        // Entering Item View -> default to General
        setActiveTab('general');
      } else {
        // Exiting Item View -> go back to Items list
        setActiveTab('items');
      }
      prevSelectedItemIndex.current = selectedItemIndex;
    }
  }, [selectedItemIndex]);

  // Reset tab when switching features
  useEffect(() => {
    setActiveTab('general');
  }, [feature.id]);

  // If specific item is selected
  if (selectedItemIndex !== undefined && feature.items?.[selectedItemIndex]) {
    const item = feature.items[selectedItemIndex];
    const itemIndex = selectedItemIndex;

    return (
      <div className="h-full flex flex-col">
        <ConfigHeader
          title={item.name || item.id || 'Item'}
          id={item.id}
          onCancel={() => onSelectItem(undefined)}
          cancelLabel="Back"
          saveLabel="Done" 
          // Note: "Cancel" here acts as "Back" to list
        />

        <Tabs
          tabs={[
            { id: 'general', label: 'General' },
            { id: 'appearance', label: 'Appearance' },
            { id: 'translations', label: 'Translations' }
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
        />

        <div className="flex-1 overflow-auto">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label flex items-center gap-2">
                    Item ID
                    {item.id && (
                      <button
                        type="button"
                        className="text-xs px-1 hover:bg-slate-700 rounded"
                        onClick={() => toggleNonTranslatableKey(item.id!)}
                        title={isNonTranslatableKey(item.id) ? 'Click to enable translations' : 'Click to mark as non-translatable'}
                      >
                        {isNonTranslatableKey(item.id) ? '🔒' : '🔓'}
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={item.id || ''}
                    onChange={(e) => onUpdateItem(itemIndex, { id: (e.target as HTMLInputElement).value })}
                    placeholder="unique_item_id"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Item Name (Internal)</label>
                  <input
                    type="text"
                    className="form-input"
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
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div className="form-group">
                <label className="flex items-center gap-2 cursor-pointer p-3 border border-slate-700 rounded-lg bg-slate-800/50">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={item.showLegend || false}
                    onChange={(e) => onUpdateItem(itemIndex, { showLegend: (e.target as HTMLInputElement).checked })}
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-200 block">Show Legend</span>
                    <span className="text-xs text-slate-500">Display this item in the legend panel</span>
                  </div>
                </label>
              </div>

              {item.showLegend && (
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
                      value={item.legendUrl || ''}
                      onChange={(e) => onUpdateItem(itemIndex, { legendUrl: (e.target as HTMLInputElement).value })}
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
                      value={item.legendDescription || ''}
                      onChange={(e) => onUpdateItem(itemIndex, { legendDescription: (e.target as HTMLInputElement).value })}
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
                  translationKey={item.id}
                  label={`Name Translations (ID: ${item.id || 'none'})`}
                />
              </div>
              
              {item.legendDescription && (
                 <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <TranslationForm
                    translationKey={item.legendDescription}
                    label={`Legend Description (ID: ${item.legendDescription})`}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        <LayerEditorModal
          layerId={editingLayerId.value}
          onClose={() => editingLayerId.value = null}
        />
      </div>
    );
  }

  // Feature Group View
  return (
    <div className="space-y-4">
      <ConfigHeader
        title={feature.name || feature.id || 'Feature'}
        id={feature.id}
        isNew={isNew}
      />

      <ValidationDisplay validation={validation.value} className="mb-4" />

      <Tabs
        tabs={[
          { id: 'general', label: 'General' },
          { id: 'items', label: 'Items' },
          { id: 'translations', label: 'Translations' }
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
      />

      {/* Feature Type Selector (only for new) */}
      {isNew && onFeatureTypeChange && (
        <div className="form-group mb-4">
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

      {activeTab === 'general' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                Feature ID
                {feature.id && (
                  <button
                    type="button"
                    className="text-xs px-1 hover:bg-slate-700 rounded"
                    onClick={() => toggleNonTranslatableKey(feature.id!)}
                    title={isNonTranslatableKey(feature.id) ? 'Click to enable translations' : 'Click to mark as non-translatable'}
                  >
                    {isNonTranslatableKey(feature.id) ? '🔒' : '🔓'}
                  </button>
                )}
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
              <label className="form-label">Feature Name (Internal)</label>
              <input
                type="text"
                className="form-input"
                value={feature.name || ''}
                onChange={(e) => onUpdate({ name: (e.target as HTMLInputElement).value })}
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
                  const isSelected = (feature.presentation || 'single') === opt.value;
                  return (
                    <button
                      key={opt.value}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-transparent text-slate-300 border-slate-600 hover:border-slate-500'
                      }`}
                      onClick={() => onUpdate({ presentation: opt.value as 'single' | 'multiple' })}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {feature.presentation === 'multiple' && (
              <div className="form-group flex items-center mt-6">
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
        </div>
      )}

      {activeTab === 'items' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-slate-300">Feature Items</h3>
            <button
              className="btn tiny primary"
              onClick={() => {
                const items = [...(feature.items || [])];
                const newIndex = items.length;
                items.push({ id: '', name: '', showLegend: false, layersIds: [] });
                onUpdate({ items });
                // Select the new item for editing
                setTimeout(() => onSelectItem(newIndex), 0);
              }}
            >
              + Add Item
            </button>
          </div>

          {(feature.items || []).map((item, itemIndex) => {
            const hasErrors = !item.id || !item.name || (item.layersIds?.length || 0) === 0;
            return (
              <div
                key={itemIndex}
                className={`border rounded-lg p-3 bg-slate-800/50 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors ${
                  hasErrors ? 'border-red-600/50' : 'border-slate-600'
                }`}
                onClick={() => onSelectItem(itemIndex)}
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
                      onSelectItem(itemIndex);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn tiny danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(itemIndex, item);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          {(feature.items?.length || 0) === 0 && (
            <div className="text-center py-4 border border-dashed border-slate-600 rounded">
              <p className="text-slate-500 text-sm mb-2">No items defined</p>
              <button
                className="btn small primary"
                onClick={() => {
                  onUpdate({ items: [{ id: '', name: '', showLegend: false, layersIds: [] }] });
                  // Select the new item for editing
                  setTimeout(() => onSelectItem(0), 0);
                }}
              >
                Add First Item
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'translations' && (
        <div className="space-y-6">
          {/* Feature translations */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <TranslationForm
              translationKey={feature.id}
              label={`Feature Name Translations (ID: ${feature.id || 'none'})`}
            />
          </div>

          {/* Item translations */}
          {(feature.items || []).length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-400 border-b border-slate-700 pb-2">Item Translations</h4>
              {(feature.items || []).map((item, idx) => (
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

      {/* Modals */}
      <LayerEditorModal
        layerId={editingLayerId.value}
        onClose={() => editingLayerId.value = null}
      />
    </div>
  );
}