import { useSignal } from '@preact/signals';
import { useRef, useCallback, useEffect } from 'preact/hooks';
import {
  jsonData,
  selectFeature,
  selectLayer,
  updateJsonData,
  setStatus,
  deleteLayerByIndex
} from '../lib/jsonStore';
import { MapFeature, MapLayerItem, LayerEntry, LayerConfig } from '../lib/types';
import { upsertLayerEntry } from '../lib/layers';
import { validateLayerEntry, validateFeature } from '../lib/validation';
import { autoSyncFeatureTranslations } from '../lib/intl';
import Navigator, { TreeSelection } from './workspace/Navigator';
import FeatureEditor from './workspace/FeatureEditor';
import LayerEditor from './workspace/LayerEditor';
import QuickLayerModal from './workspace/QuickLayerModal';
import ConfirmDialog, { useConfirmDialog } from './ui/ConfirmDialog';
import Editor from '@monaco-editor/react';

type EditorMode = 'none' | 'feature' | 'layer';
type EditorViewMode = 'form' | 'json';

const MIN_NAV_WIDTH = 200;
const MAX_NAV_WIDTH_PERCENT = 0.4;
const DEFAULT_NAV_WIDTH = 320;
const NAV_WIDTH_STORAGE_KEY = 'hemswx-nav-width';

const getStoredNavWidth = (): number => {
  try {
    const stored = localStorage.getItem(NAV_WIDTH_STORAGE_KEY);
    if (stored) {
      const width = parseInt(stored, 10);
      if (!isNaN(width) && width >= MIN_NAV_WIDTH) {
        return width;
      }
    }
  } catch {}
  return DEFAULT_NAV_WIDTH;
};

const saveNavWidth = (width: number) => {
  try {
    localStorage.setItem(NAV_WIDTH_STORAGE_KEY, String(Math.round(width)));
  } catch {}
};

export default function WorkspacePanel() {
  const mode = useSignal<EditorMode>('none');
  const editorViewMode = useSignal<EditorViewMode>('form');
  const isNewItem = useSignal(false);
  const treeSelection = useSignal<TreeSelection>(null);
  const featureDraft = useSignal<{ feature: MapFeature; featureType: 'weatherFeatures' | 'features' } | null>(null);
  const layerDraft = useSignal<LayerEntry | null>(null);
  const layerCreatorItemIndex = useSignal<number | null>(null);
  const navWidth = useSignal(getStoredNavWidth());
  const isResizing = useSignal(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastAutoSaveRef = useRef<string>('');

  // Delete confirmation modal state
  const deleteModal = useSignal<{
    open: boolean;
    featureType: 'weatherFeatures' | 'features';
    index: number;
    featureName: string;
    translationKeys: string[];
    layerIds: string[];
    exclusiveLayerIds: string[]; // layers only used by this feature
    deleteTranslations: boolean;
    deleteLayers: boolean;
  } | null>(null);

  // Delete item confirmation modal state
  const deleteItemModal = useSignal<{
    open: boolean;
    itemIndex: number;
    itemName: string;
    translationKeys: string[];
    layerIds: string[];
    exclusiveLayerIds: string[];
    deleteTranslations: boolean;
    deleteLayers: boolean;
  } | null>(null);

  // Generic confirm dialog
  const confirmDialog = useConfirmDialog();

  // Sync draft with jsonData when it changes externally (e.g., undo/redo)
  useEffect(() => {
    if (isNewItem.value) return;

    if (treeSelection.value?.type === 'feature') {
      const { featureType, index } = treeSelection.value;
      const currentData = jsonData.value[featureType]?.[index];
      if (currentData) {
        const currentJson = JSON.stringify(currentData);
        // Only sync if data changed and it wasn't from our auto-save
        if (lastAutoSaveRef.current !== currentJson) {
          featureDraft.value = {
            feature: JSON.parse(currentJson),
            featureType
          };
        }
      }
    } else if (treeSelection.value?.type === 'layer') {
      const currentData = jsonData.value.layers?.[treeSelection.value.index];
      if (currentData) {
        const currentJson = JSON.stringify(currentData);
        if (lastAutoSaveRef.current !== currentJson) {
          layerDraft.value = JSON.parse(currentJson);
        }
      }
    }
  }, [jsonData.value]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    isResizing.value = true;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const maxWidth = containerRect.width * MAX_NAV_WIDTH_PERCENT;
      const newWidth = Math.min(maxWidth, Math.max(MIN_NAV_WIDTH, e.clientX - containerRect.left));
      navWidth.value = newWidth;
    };

    const handleMouseUp = () => {
      isResizing.value = false;
      saveNavWidth(navWidth.value);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const getFeatureDisplayName = (feature: MapFeature) => {
    if (feature.name?.trim()) return feature.name;
    if (feature.presentation === 'single' && feature.items?.[0]?.name?.trim()) {
      return feature.items[0].name;
    }
    return feature.id || 'Unnamed';
  };

  // Selection handlers - immediately create draft for editing
  const handleSelectFeature = (featureType: 'weatherFeatures' | 'features', index: number) => {
    const feature = jsonData.value[featureType]?.[index];
    if (!feature) return;

    treeSelection.value = { type: 'feature', featureType, index };
    selectFeature(featureType, index);
    mode.value = 'feature';
    isNewItem.value = false;
    featureDraft.value = {
      feature: JSON.parse(JSON.stringify(feature)),
      featureType
    };
    layerDraft.value = null;
  };

  const handleSelectLayer = (index: number) => {
    const layer = jsonData.value.layers?.[index];
    if (!layer) return;

    treeSelection.value = { type: 'layer', index };
    selectLayer(index);
    mode.value = 'layer';
    isNewItem.value = false;
    layerDraft.value = JSON.parse(JSON.stringify(layer));
    featureDraft.value = null;
  };

  // New handlers
  const handleNewFeature = (featureType: 'weatherFeatures' | 'features') => {
    mode.value = 'feature';
    isNewItem.value = true;
    featureDraft.value = {
      feature: {
        presentation: 'single',
        items: [{ id: '', name: '', showLegend: false, layersIds: [] }]
      },
      featureType
    };
    treeSelection.value = null;
    layerDraft.value = null;
  };

  // Auto-save feature if valid (for existing items)
  const autoSaveFeature = (feature: MapFeature) => {
    if (isNewItem.value || treeSelection.value?.type !== 'feature') return;

    const validation = validateFeature(feature);
    if (!validation.valid) return;

    // Track what we're saving to avoid sync loop
    lastAutoSaveRef.current = JSON.stringify(feature);

    const syncedData = autoSyncFeatureTranslations(jsonData.value, feature);
    const updated = JSON.parse(JSON.stringify(syncedData));
    updated[treeSelection.value.featureType][treeSelection.value.index] = feature;
    updateJsonData(updated);
  };

  // Auto-save layer if valid (for existing items)
  const autoSaveLayer = (layer: LayerEntry) => {
    if (isNewItem.value || treeSelection.value?.type !== 'layer') return;

    const validation = validateLayerEntry(layer);
    if (!validation.valid) return;

    // Track what we're saving to avoid sync loop
    lastAutoSaveRef.current = JSON.stringify(layer);

    const updated = upsertLayerEntry(jsonData.value, layer);
    updateJsonData(updated);
  };

  // Create new feature (only for new items)
  const handleCreateFeature = () => {
    if (!featureDraft.value || !isNewItem.value) return;

    const { feature, featureType } = featureDraft.value;
    const validation = validateFeature(feature);

    if (!validation.valid) {
      setStatus(validation.errors[0] || 'Invalid feature');
      return;
    }

    const syncedData = autoSyncFeatureTranslations(jsonData.value, feature);
    const updated = JSON.parse(JSON.stringify(syncedData));
    updated[featureType].push(feature);
    updateJsonData(updated);

    const newIndex = updated[featureType].length - 1;
    treeSelection.value = { type: 'feature', featureType, index: newIndex };
    isNewItem.value = false;
    setStatus('Feature created');
  };

  // Create new layer (only for new items)
  const handleCreateLayer = () => {
    if (!layerDraft.value || !isNewItem.value) return;

    const validation = validateLayerEntry(layerDraft.value);
    if (!validation.valid) {
      setStatus(validation.errors[0] || 'Invalid layer');
      return;
    }

    const updated = upsertLayerEntry(jsonData.value, layerDraft.value);
    updateJsonData(updated);

    const newIndex = updated.layers.findIndex(l => l.id === layerDraft.value!.id);
    if (newIndex >= 0) {
      treeSelection.value = { type: 'layer', index: newIndex };
    }
    isNewItem.value = false;
    setStatus('Layer created');
  };

  const handleCancel = () => {
    if (isNewItem.value) {
      mode.value = 'none';
      featureDraft.value = null;
      layerDraft.value = null;
      treeSelection.value = null;
    } else if (treeSelection.value?.type === 'feature') {
      // Revert to original data
      const { featureType, index } = treeSelection.value;
      const original = jsonData.value[featureType]?.[index];
      if (original) {
        featureDraft.value = {
          feature: JSON.parse(JSON.stringify(original)),
          featureType
        };
      }
    } else if (treeSelection.value?.type === 'layer') {
      const original = jsonData.value.layers?.[treeSelection.value.index];
      if (original) {
        layerDraft.value = JSON.parse(JSON.stringify(original));
      }
    }
  };

  // Delete handlers
  const handleDeleteFeature = () => {
    if (treeSelection.value?.type !== 'feature') return;
    const { featureType, index } = treeSelection.value;
    const feature = jsonData.value[featureType][index];
    const name = getFeatureDisplayName(feature);

    // Collect translation keys from feature
    const translationKeys: string[] = [];
    if (feature.id) translationKeys.push(feature.id);
    feature.items?.forEach(item => {
      if (item.id) translationKeys.push(item.id);
      if (item.legendDescription) translationKeys.push(item.legendDescription);
    });

    // Collect layer IDs from feature
    const layerIds: string[] = [];
    feature.items?.forEach(item => {
      item.layersIds?.forEach(id => {
        if (!layerIds.includes(id)) layerIds.push(id);
      });
    });

    // Find which layers are exclusively used by this feature
    const exclusiveLayerIds = layerIds.filter(layerId => {
      let usageCount = 0;
      [...jsonData.value.weatherFeatures, ...jsonData.value.features].forEach(f => {
        f.items?.forEach(item => {
          if (item.layersIds?.includes(layerId)) usageCount++;
        });
      });
      return usageCount <= 1;
    });

    deleteModal.value = {
      open: true,
      featureType,
      index,
      featureName: name,
      translationKeys,
      layerIds,
      exclusiveLayerIds,
      deleteTranslations: false,
      deleteLayers: false
    };
  };

  const confirmDeleteFeature = () => {
    if (!deleteModal.value) return;
    const { featureType, index, deleteTranslations, deleteLayers, translationKeys, exclusiveLayerIds } = deleteModal.value;

    let updated = JSON.parse(JSON.stringify(jsonData.value));

    // Delete translations if requested
    if (deleteTranslations && translationKeys.length > 0) {
      const langs = ['en', 'da', 'nb', 'sv'] as const;
      langs.forEach(lang => {
        if (updated.intl?.[lang]) {
          translationKeys.forEach(key => {
            delete updated.intl[lang][key];
          });
        }
      });
    }

    // Delete exclusive layers if requested
    if (deleteLayers && exclusiveLayerIds.length > 0) {
      updated.layers = updated.layers.filter((l: LayerEntry) => !exclusiveLayerIds.includes(l.id));
    }

    // Delete the feature
    updated[featureType] = updated[featureType].filter((_: any, i: number) => i !== index);

    updateJsonData(updated);
    deleteModal.value = null;
    treeSelection.value = null;
    mode.value = 'none';
    featureDraft.value = null;
    setStatus('Feature deleted');
  };

  // Handle item removal with confirmation
  const handleRemoveItem = (itemIndex: number, item: MapLayerItem) => {
    const itemName = item.name || item.id || `Item #${itemIndex + 1}`;

    // Collect translation keys from item
    const translationKeys: string[] = [];
    if (item.id) translationKeys.push(item.id);
    if (item.legendDescription) translationKeys.push(item.legendDescription);

    // Collect layer IDs from item
    const layerIds = item.layersIds || [];

    // Find which layers are exclusively used by this item
    const exclusiveLayerIds = layerIds.filter(layerId => {
      let usageCount = 0;
      [...jsonData.value.weatherFeatures, ...jsonData.value.features].forEach(f => {
        f.items?.forEach(i => {
          if (i.layersIds?.includes(layerId)) usageCount++;
        });
      });
      return usageCount <= 1;
    });

    // If no translations or layers to clean up, just remove directly
    if (translationKeys.length === 0 && exclusiveLayerIds.length === 0) {
      if (featureDraft.value) {
        const items = [...featureDraft.value.feature.items];
        items.splice(itemIndex, 1);
        const updatedFeature = { ...featureDraft.value.feature, items };
        featureDraft.value = { ...featureDraft.value, feature: updatedFeature };
        autoSaveFeature(updatedFeature);
      }
      return;
    }

    deleteItemModal.value = {
      open: true,
      itemIndex,
      itemName,
      translationKeys,
      layerIds,
      exclusiveLayerIds,
      deleteTranslations: false,
      deleteLayers: false
    };
  };

  const confirmDeleteItem = () => {
    if (!deleteItemModal.value || !featureDraft.value) return;
    const { itemIndex, deleteTranslations, deleteLayers, translationKeys, exclusiveLayerIds } = deleteItemModal.value;

    let updated = JSON.parse(JSON.stringify(jsonData.value));

    // Delete translations if requested
    if (deleteTranslations && translationKeys.length > 0) {
      const langs = ['en', 'da', 'nb', 'sv'] as const;
      langs.forEach(lang => {
        if (updated.intl?.[lang]) {
          translationKeys.forEach(key => {
            delete updated.intl[lang][key];
          });
        }
      });
    }

    // Delete exclusive layers if requested
    if (deleteLayers && exclusiveLayerIds.length > 0) {
      updated.layers = updated.layers.filter((l: LayerEntry) => !exclusiveLayerIds.includes(l.id));
    }

    // Remove the item from feature draft
    const items = [...featureDraft.value.feature.items];
    items.splice(itemIndex, 1);
    const updatedFeature = { ...featureDraft.value.feature, items };
    featureDraft.value = { ...featureDraft.value, feature: updatedFeature };

    // Update the feature in the data
    if (treeSelection.value?.type === 'feature' && !isNewItem.value) {
      lastAutoSaveRef.current = JSON.stringify(updatedFeature);
      updated[treeSelection.value.featureType][treeSelection.value.index] = updatedFeature;
    }

    updateJsonData(updated);
    deleteItemModal.value = null;
    setStatus('Item removed');
  };

  const handleDeleteLayer = () => {
    if (treeSelection.value?.type !== 'layer') return;
    const layer = jsonData.value.layers[treeSelection.value.index];
    const layerIndex = treeSelection.value.index;

    confirmDialog.confirm({
      title: 'Delete Layer',
      message: `Are you sure you want to delete layer "${layer.id}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        deleteLayerByIndex(layerIndex);
        treeSelection.value = null;
        mode.value = 'none';
        layerDraft.value = null;
      }
    });
  };

  // Duplicate handlers
  const handleDuplicateFeature = () => {
    if (!featureDraft.value || treeSelection.value?.type !== 'feature') return;
    const feature = featureDraft.value.feature;
    mode.value = 'feature';
    isNewItem.value = true;
    featureDraft.value = {
      feature: {
        ...JSON.parse(JSON.stringify(feature)),
        id: feature.id ? `${feature.id}_copy` : '',
        name: feature.name ? `${feature.name} (Copy)` : '',
        items: feature.items.map(item => ({
          ...item,
          id: item.id ? `${item.id}_copy` : '',
          name: item.name ? `${item.name} (Copy)` : ''
        }))
      },
      featureType: treeSelection.value.featureType
    };
    treeSelection.value = null;
  };

  const handleDuplicateLayer = () => {
    if (!layerDraft.value) return;
    mode.value = 'layer';
    isNewItem.value = true;
    layerDraft.value = {
      ...JSON.parse(JSON.stringify(layerDraft.value)),
      id: `${layerDraft.value.id}_copy`
    };
    treeSelection.value = null;
  };

  // Draft update handlers with auto-save
  const updateFeatureDraft = (changes: Partial<MapFeature>) => {
    if (!featureDraft.value) return;
    const updatedFeature = { ...featureDraft.value.feature, ...changes };
    featureDraft.value = {
      ...featureDraft.value,
      feature: updatedFeature
    };
    autoSaveFeature(updatedFeature);
  };

  const updateFeatureItem = (index: number, changes: Partial<MapLayerItem>) => {
    if (!featureDraft.value) return;
    const items = [...featureDraft.value.feature.items];
    items[index] = { ...items[index], ...changes };
    const updatedFeature = { ...featureDraft.value.feature, items };
    featureDraft.value = {
      ...featureDraft.value,
      feature: updatedFeature
    };
    autoSaveFeature(updatedFeature);
  };

  const updateLayerDraft = (changes: Partial<LayerEntry>) => {
    if (!layerDraft.value) return;
    const updatedLayer = { ...layerDraft.value, ...changes };
    layerDraft.value = updatedLayer;
    autoSaveLayer(updatedLayer);
  };

  const updateSublayer = (index: number, changes: Partial<LayerConfig>) => {
    if (!layerDraft.value) return;
    const newLayers = [...layerDraft.value.layers];
    newLayers[index] = { ...newLayers[index], ...changes };
    const updatedLayer = { ...layerDraft.value, layers: newLayers };
    layerDraft.value = updatedLayer;
    autoSaveLayer(updatedLayer);
  };

  // Quick layer creation
  const handleQuickCreateLayer = (newLayer: LayerEntry) => {
    const updated = upsertLayerEntry(jsonData.value, newLayer);
    updateJsonData(updated);

    if (layerCreatorItemIndex.value !== null && featureDraft.value) {
      const items = [...featureDraft.value.feature.items];
      const item = items[layerCreatorItemIndex.value];
      if (!item.layersIds) item.layersIds = [];
      if (!item.layersIds.includes(newLayer.id)) {
        item.layersIds = [...item.layersIds, newLayer.id];
      }
      featureDraft.value = {
        ...featureDraft.value,
        feature: { ...featureDraft.value.feature, items }
      };
    }

    layerCreatorItemIndex.value = null;
    setStatus(`Layer "${newLayer.id}" created`);
  };

  return (
    <div ref={containerRef} className="flex h-full">
      {/* Left Panel - Navigator */}
      <div style={{ width: navWidth.value }} className="flex-shrink-0">
        <Navigator
          selection={treeSelection.value}
          onSelectFeature={handleSelectFeature}
          onSelectLayer={handleSelectLayer}
          onNewFeature={handleNewFeature}
        />
      </div>

      {/* Resize Handle */}
      <div
        className={`w-1.5 cursor-col-resize flex-shrink-0 group hover:bg-blue-500/50 transition-colors ${
          isResizing.value ? 'bg-blue-500/50' : ''
        }`}
        onMouseDown={handleMouseDown as any}
      >
        <div className={`w-0.5 h-full mx-auto ${isResizing.value ? 'bg-blue-500' : 'bg-transparent group-hover:bg-blue-500'}`} />
      </div>

      {/* Right Panel - Editor */}
      <div className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col overflow-hidden ml-1.5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-medium text-white">
                {mode.value === 'none' ? 'Select an item' :
                 isNewItem.value && mode.value === 'feature' ? 'New Feature' :
                 isNewItem.value && mode.value === 'layer' ? 'New Layer' :
                 mode.value === 'feature' ? getFeatureDisplayName(featureDraft.value!.feature) :
                 mode.value === 'layer' ? layerDraft.value!.id || 'Layer' :
                 'Select an item'}
              </h2>
              {mode.value === 'feature' && featureDraft.value && !isNewItem.value && (
                <div className="text-xs text-slate-400 mt-0.5">
                  {featureDraft.value.featureType === 'weatherFeatures' ? 'Weather Feature' : 'General Feature'} • {featureDraft.value.feature.presentation}
                </div>
              )}
              {mode.value === 'layer' && layerDraft.value && !isNewItem.value && (
                <div className="text-xs text-slate-400 mt-0.5">
                  {layerDraft.value.layers?.length || 0} sublayer(s)
                </div>
              )}
            </div>

            {/* View mode tabs */}
            {mode.value !== 'none' && (
              <div className="flex gap-1 border-l border-slate-600 pl-4">
                <button
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    editorViewMode.value === 'form'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  onClick={() => editorViewMode.value = 'form'}
                >
                  Form
                </button>
                <button
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    editorViewMode.value === 'json'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  onClick={() => editorViewMode.value = 'json'}
                >
                  JSON
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {mode.value === 'feature' && (
              <>
                {isNewItem.value ? (
                  <>
                    <button className="btn success small" onClick={handleCreateFeature}>Create</button>
                    <button className="btn ghost small" onClick={handleCancel}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="btn ghost small" onClick={handleCancel}>Revert</button>
                    <button className="btn ghost small" onClick={handleDuplicateFeature}>Duplicate</button>
                    <button className="btn danger small" onClick={handleDeleteFeature}>Delete</button>
                  </>
                )}
              </>
            )}
            {mode.value === 'layer' && (
              <>
                {isNewItem.value ? (
                  <>
                    <button className="btn success small" onClick={handleCreateLayer}>Create</button>
                    <button className="btn ghost small" onClick={handleCancel}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="btn ghost small" onClick={handleCancel}>Revert</button>
                    <button className="btn ghost small" onClick={handleDuplicateLayer}>Duplicate</button>
                    <button className="btn danger small" onClick={handleDeleteLayer}>Delete</button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {mode.value === 'none' && (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <p className="mb-4">Select a feature or layer from the navigator</p>
                <div className="flex gap-2 justify-center">
                  <button className="btn primary" onClick={() => handleNewFeature('weatherFeatures')}>
                    New Weather Feature
                  </button>
                  <button className="btn" onClick={() => handleNewFeature('features')}>
                    New General Feature
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form View */}
          {editorViewMode.value === 'form' && (
            <>
              {/* Feature Editor */}
              {mode.value === 'feature' && featureDraft.value && (
                <FeatureEditor
                  feature={featureDraft.value.feature}
                  featureType={featureDraft.value.featureType}
                  isNew={isNewItem.value}
                  onUpdate={updateFeatureDraft}
                  onUpdateItem={updateFeatureItem}
                  onRemoveItem={handleRemoveItem}
                  onFeatureTypeChange={isNewItem.value ? (type) => {
                    featureDraft.value = { ...featureDraft.value!, featureType: type };
                  } : undefined}
                  onOpenLayerCreator={(itemIndex) => layerCreatorItemIndex.value = itemIndex}
                />
              )}

              {/* Layer Editor */}
              {mode.value === 'layer' && layerDraft.value && (
                <LayerEditor
                  layer={layerDraft.value}
                  onUpdate={updateLayerDraft}
                  onUpdateSublayer={updateSublayer}
                />
              )}
            </>
          )}

          {/* JSON View */}
          {editorViewMode.value === 'json' && mode.value !== 'none' && (
            <div className="h-full flex flex-col">
              <div className="text-xs text-slate-400 mb-2">
                Edit JSON directly. Changes auto-save when valid.
              </div>
              <div className="flex-1 border border-slate-600 rounded overflow-hidden">
                <Editor
                  height="100%"
                  language="json"
                  theme="vs-dark"
                  value={
                    mode.value === 'feature' && featureDraft.value
                      ? (() => {
                          const feature = featureDraft.value.feature;
                          const referencedLayerIds = new Set<string>();
                          feature.items?.forEach(item => {
                            item.layersIds?.forEach(id => referencedLayerIds.add(id));
                          });
                          const layers = jsonData.value.layers.filter(l => referencedLayerIds.has(l.id));

                          // Collect translation keys from feature
                          const translationKeys = new Set<string>();
                          if (feature.id) translationKeys.add(feature.id);
                          feature.items?.forEach(item => {
                            if (item.id) translationKeys.add(item.id);
                            if (item.legendDescription) translationKeys.add(item.legendDescription);
                          });

                          // Build intl object with only relevant keys
                          const intl: Record<string, Record<string, string>> = {};
                          ['en', 'da', 'nb', 'sv'].forEach(lang => {
                            intl[lang] = {};
                            translationKeys.forEach(key => {
                              if (jsonData.value.intl?.[lang]?.[key]) {
                                intl[lang][key] = jsonData.value.intl[lang][key];
                              }
                            });
                          });

                          return JSON.stringify({ feature, layers, intl }, null, 2);
                        })()
                      : mode.value === 'layer' && layerDraft.value
                      ? JSON.stringify(layerDraft.value, null, 2)
                      : '{}'
                  }
                  onChange={(value: string | undefined) => {
                    if (!value) return;
                    try {
                      const parsed = JSON.parse(value);

                      if (mode.value === 'feature' && featureDraft.value) {
                        // Handle feature + layers + intl JSON
                        const newFeature = parsed.feature || parsed;
                        const newLayers = parsed.layers || [];
                        const newIntl = parsed.intl;

                        // Update feature draft
                        featureDraft.value = {
                          ...featureDraft.value,
                          feature: newFeature
                        };

                        // Start with current data
                        let updated = JSON.parse(JSON.stringify(jsonData.value));

                        // Upsert all layers
                        newLayers.forEach((layer: LayerEntry) => {
                          if (layer.id) {
                            updated = upsertLayerEntry(updated, layer);
                          }
                        });

                        // Update intl if provided
                        if (newIntl) {
                          if (!updated.intl) {
                            updated.intl = { en: {}, da: {}, nb: {}, sv: {} };
                          }
                          ['en', 'da', 'nb', 'sv'].forEach(lang => {
                            if (newIntl[lang]) {
                              if (!updated.intl[lang]) {
                                updated.intl[lang] = {};
                              }
                              Object.assign(updated.intl[lang], newIntl[lang]);
                            }
                          });
                        }

                        // Auto-save feature if valid
                        const validation = validateFeature(newFeature);
                        if (validation.valid && treeSelection.value?.type === 'feature' && !isNewItem.value) {
                          lastAutoSaveRef.current = JSON.stringify(newFeature);
                          const syncedData = autoSyncFeatureTranslations(updated, newFeature);
                          const finalData = JSON.parse(JSON.stringify(syncedData));
                          finalData[treeSelection.value.featureType][treeSelection.value.index] = newFeature;
                          updateJsonData(finalData);
                        } else if (newLayers.length > 0 || newIntl) {
                          // At least save the layers and intl
                          updateJsonData(updated);
                        } else {
                          // No layers or intl, just auto-save feature
                          autoSaveFeature(newFeature);
                        }
                      } else if (mode.value === 'layer' && layerDraft.value) {
                        // Handle layer JSON
                        layerDraft.value = parsed;
                        autoSaveLayer(parsed);
                      }
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: 'on',
                    folding: true,
                    wordWrap: 'on',
                    bracketPairColorization: { enabled: true },
                    scrollBeyondLastLine: false,
                  }}
                  loading={<div className="flex items-center justify-center h-full text-slate-400">Loading...</div>}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Layer Creator Modal */}
      <QuickLayerModal
        isOpen={layerCreatorItemIndex.value !== null}
        onClose={() => layerCreatorItemIndex.value = null}
        onCreateLayer={handleQuickCreateLayer}
      />

      {/* Delete Item Confirmation Modal */}
      {deleteItemModal.value?.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-white mb-4">
              Remove "{deleteItemModal.value.itemName}"?
            </h3>

            <div className="space-y-3 mb-6">
              {/* Translations option */}
              {deleteItemModal.value.translationKeys.length > 0 && (
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    className="form-checkbox mt-0.5"
                    checked={deleteItemModal.value.deleteTranslations}
                    onChange={(e) => {
                      deleteItemModal.value = {
                        ...deleteItemModal.value!,
                        deleteTranslations: (e.target as HTMLInputElement).checked
                      };
                    }}
                  />
                  <div>
                    <div className="text-sm text-white">Also delete translations</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {deleteItemModal.value.translationKeys.length} key(s): {deleteItemModal.value.translationKeys.join(', ')}
                    </div>
                  </div>
                </label>
              )}

              {/* Layers option */}
              {deleteItemModal.value.exclusiveLayerIds.length > 0 && (
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    className="form-checkbox mt-0.5"
                    checked={deleteItemModal.value.deleteLayers}
                    onChange={(e) => {
                      deleteItemModal.value = {
                        ...deleteItemModal.value!,
                        deleteLayers: (e.target as HTMLInputElement).checked
                      };
                    }}
                  />
                  <div>
                    <div className="text-sm text-white">Also delete unused layers</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {deleteItemModal.value.exclusiveLayerIds.length} layer(s) only used by this item: {deleteItemModal.value.exclusiveLayerIds.slice(0, 2).join(', ')}
                      {deleteItemModal.value.exclusiveLayerIds.length > 2 && ` +${deleteItemModal.value.exclusiveLayerIds.length - 2} more`}
                    </div>
                  </div>
                </label>
              )}

              {deleteItemModal.value.layerIds.length > 0 && deleteItemModal.value.exclusiveLayerIds.length < deleteItemModal.value.layerIds.length && (
                <div className="text-xs text-slate-500 px-3">
                  {deleteItemModal.value.layerIds.length - deleteItemModal.value.exclusiveLayerIds.length} layer(s) are used elsewhere and won't be deleted.
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                className="btn ghost"
                onClick={() => deleteItemModal.value = null}
              >
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={confirmDeleteItem}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Feature Confirmation Modal */}
      {deleteModal.value?.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-white mb-4">
              Delete "{deleteModal.value.featureName}"?
            </h3>

            <div className="space-y-3 mb-6">
              {/* Translations option */}
              {deleteModal.value.translationKeys.length > 0 && (
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    className="form-checkbox mt-0.5"
                    checked={deleteModal.value.deleteTranslations}
                    onChange={(e) => {
                      deleteModal.value = {
                        ...deleteModal.value!,
                        deleteTranslations: (e.target as HTMLInputElement).checked
                      };
                    }}
                  />
                  <div>
                    <div className="text-sm text-white">Also delete translations</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {deleteModal.value.translationKeys.length} key(s): {deleteModal.value.translationKeys.slice(0, 3).join(', ')}
                      {deleteModal.value.translationKeys.length > 3 && ` +${deleteModal.value.translationKeys.length - 3} more`}
                    </div>
                  </div>
                </label>
              )}

              {/* Layers option */}
              {deleteModal.value.exclusiveLayerIds.length > 0 && (
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    className="form-checkbox mt-0.5"
                    checked={deleteModal.value.deleteLayers}
                    onChange={(e) => {
                      deleteModal.value = {
                        ...deleteModal.value!,
                        deleteLayers: (e.target as HTMLInputElement).checked
                      };
                    }}
                  />
                  <div>
                    <div className="text-sm text-white">Also delete unused layers</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {deleteModal.value.exclusiveLayerIds.length} layer(s) only used by this feature: {deleteModal.value.exclusiveLayerIds.slice(0, 2).join(', ')}
                      {deleteModal.value.exclusiveLayerIds.length > 2 && ` +${deleteModal.value.exclusiveLayerIds.length - 2} more`}
                    </div>
                  </div>
                </label>
              )}

              {deleteModal.value.layerIds.length > 0 && deleteModal.value.exclusiveLayerIds.length < deleteModal.value.layerIds.length && (
                <div className="text-xs text-slate-500 px-3">
                  {deleteModal.value.layerIds.length - deleteModal.value.exclusiveLayerIds.length} layer(s) are used by other features and won't be deleted.
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                className="btn ghost"
                onClick={() => deleteModal.value = null}
              >
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={confirmDeleteFeature}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen.value}
        title={confirmDialog.config.value?.title || ''}
        message={confirmDialog.config.value?.message || ''}
        confirmLabel={confirmDialog.config.value?.confirmLabel}
        cancelLabel={confirmDialog.config.value?.cancelLabel}
        variant={confirmDialog.config.value?.variant}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />
    </div>
  );
}
