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
import { MapFeature, MapLayerItem, LayerEntry, LayerConfig, TreeSelection } from '../lib/types';
import { upsertLayerEntry } from '../lib/layers';
import { validateLayerEntry, validateFeature } from '../lib/validation';
import { autoSyncFeatureTranslations } from '../lib/intl';
import Navigator from './workspace/Navigator';
import FeatureEditor from './workspace/FeatureEditor';
import LayerEditor from './workspace/LayerEditor';
import QuickLayerModal from './workspace/QuickLayerModal';
import FeatureCreatorModal from './workspace/FeatureCreatorModal';
import MapPreviewPanel from './workspace/MapPreviewPanel';
import ConfirmDialog, { useConfirmDialog } from './ui/ConfirmDialog';
import Editor from '@monaco-editor/react';

type EditorMode = 'none' | 'feature' | 'layer';
type EditorViewMode = 'form' | 'json';

const MIN_NAV_WIDTH = 200;
const MAX_NAV_WIDTH_PERCENT = 0.4;
const DEFAULT_NAV_WIDTH = 320;
const NAV_WIDTH_STORAGE_KEY = 'hemswx-nav-width';

const MIN_PREVIEW_WIDTH = 250;
const MAX_PREVIEW_WIDTH_PERCENT = 0.4;
const DEFAULT_PREVIEW_WIDTH = 400;
const PREVIEW_WIDTH_STORAGE_KEY = 'hemswx-preview-width';
const PREVIEW_VISIBLE_STORAGE_KEY = 'hemswx-preview-visible';

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

const getStoredPreviewWidth = (): number => {
  try {
    const stored = localStorage.getItem(PREVIEW_WIDTH_STORAGE_KEY);
    if (stored) {
      const width = parseInt(stored, 10);
      if (!isNaN(width) && width >= MIN_PREVIEW_WIDTH) {
        return width;
      }
    }
  } catch {}
  return DEFAULT_PREVIEW_WIDTH;
};

const savePreviewWidth = (width: number) => {
  try {
    localStorage.setItem(PREVIEW_WIDTH_STORAGE_KEY, String(Math.round(width)));
  } catch {}
};

const getStoredPreviewVisible = (): boolean => {
  try {
    const stored = localStorage.getItem(PREVIEW_VISIBLE_STORAGE_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
  } catch {}
  return true;
};

const savePreviewVisible = (visible: boolean) => {
  try {
    localStorage.setItem(PREVIEW_VISIBLE_STORAGE_KEY, String(visible));
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
  const featureCreatorOpen = useSignal<'weatherFeatures' | 'features' | null>(null);
  const navWidth = useSignal(getStoredNavWidth());
  const isResizing = useSignal(false);
  const previewWidth = useSignal(getStoredPreviewWidth());
  const isPreviewResizing = useSignal(false);
  const showPreview = useSignal(getStoredPreviewVisible());
  const previewInModal = useSignal(false);
  const selectedSublayerIndex = useSignal<number | undefined>(undefined);
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

  const handlePreviewMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    isPreviewResizing.value = true;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const maxWidth = containerRect.width * MAX_PREVIEW_WIDTH_PERCENT;
      const newWidth = Math.min(maxWidth, Math.max(MIN_PREVIEW_WIDTH, containerRect.right - e.clientX));
      previewWidth.value = newWidth;
    };

    const handleMouseUp = () => {
      isPreviewResizing.value = false;
      savePreviewWidth(previewWidth.value);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const togglePreview = useCallback(() => {
    const next = !showPreview.value;
    showPreview.value = next;
    if (!next) {
      previewInModal.value = false;
    }
    savePreviewVisible(next);
  }, []);

  const getFeatureDisplayName = (feature: MapFeature) => {
    if (feature.name?.trim()) return feature.name;
    if (feature.presentation === 'single' && feature.items?.[0]?.name?.trim()) {
      return feature.items[0].name;
    }
    return feature.id || 'Unnamed';
  };

  // Selection handlers - immediately create draft for editing
  const handleSelectFeature = (featureType: 'weatherFeatures' | 'features', index: number, itemIndex?: number) => {
    const feature = jsonData.value[featureType]?.[index];
    if (!feature) return;

    treeSelection.value = { type: 'feature', featureType, index, itemIndex };
    selectFeature(featureType, index);
    mode.value = 'feature';
    selectedSublayerIndex.value = undefined;
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
    selectedSublayerIndex.value = undefined;
    isNewItem.value = false;
    layerDraft.value = JSON.parse(JSON.stringify(layer));
    featureDraft.value = null;
  };

  const handleNewItem = (featureType: 'weatherFeatures' | 'features', index: number) => {
    // Select the feature first
    handleSelectFeature(featureType, index);
    
    // Add new item to draft
    if (featureDraft.value) {
      const items = [...(featureDraft.value.feature.items || [])];
      items.push({ id: '', name: 'New Item', showLegend: false, layersIds: [] });
      
      const updatedFeature = { ...featureDraft.value.feature, items };
      featureDraft.value = { ...featureDraft.value, feature: updatedFeature };
      
      // Auto save
      autoSaveFeature(updatedFeature);
      
      // Select the new item
      const newItemIndex = items.length - 1;
      treeSelection.value = { type: 'feature', featureType, index, itemIndex: newItemIndex };
    }
  };

  // New handlers
  const handleNewFeature = (featureType: 'weatherFeatures' | 'features') => {
    featureCreatorOpen.value = featureType;
  };

  const handleFeatureCreated = (feature: MapFeature, featureType: 'weatherFeatures' | 'features') => {
    const syncedData = autoSyncFeatureTranslations(jsonData.value, feature);
    const updated = JSON.parse(JSON.stringify(syncedData));
    updated[featureType].push(feature);
    updateJsonData(updated);

    const newIndex = updated[featureType].length - 1;
    treeSelection.value = { type: 'feature', featureType, index: newIndex };
    mode.value = 'feature';
    isNewItem.value = false;
    featureDraft.value = {
      feature: JSON.parse(JSON.stringify(feature)),
      featureType
    };
    featureCreatorOpen.value = null;
    setStatus('Feature created');
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

  const handleDelete = () => {
    if (mode.value === 'feature') {
      if (treeSelection.value?.type === 'feature' && treeSelection.value.itemIndex !== undefined) {
        // Sub-item deletion
        const feature = jsonData.value[treeSelection.value.featureType][treeSelection.value.index];
        if (feature && feature.items && feature.items[treeSelection.value.itemIndex]) {
          const item = feature.items[treeSelection.value.itemIndex];
          handleRemoveItem(treeSelection.value.itemIndex, item);
        }
      } else {
        // Feature deletion
        handleDeleteFeature();
      }
    } else if (mode.value === 'layer') {
      handleDeleteLayer();
    }
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
          onNewItem={handleNewItem}
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
                 isNewItem.value && mode.value === 'layer' ? 'New Layer' :
                 mode.value === 'feature' ? getFeatureDisplayName(featureDraft.value!.feature) :
                 mode.value === 'layer' ? layerDraft.value!.id || 'Layer' :
                 'Select an item'}
              </h2>
              {mode.value === 'feature' && featureDraft.value && (
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
            {(mode.value === 'layer' || mode.value === 'feature') && (
              <div className="flex items-center gap-1 border-l border-slate-600 ml-4 pl-4">
                <button
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    showPreview.value
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  onClick={togglePreview}
                  title={showPreview.value ? 'Hide map preview' : 'Show map preview'}
                >
                  {showPreview.value ? 'Preview On' : 'Preview Off'}
                </button>
                {showPreview.value && (
                  <button
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      previewInModal.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                    onClick={() => previewInModal.value = !previewInModal.value}
                    title={previewInModal.value ? 'Dock preview in side panel' : 'Open preview in modal'}
                  >
                    {previewInModal.value ? 'Dock' : 'Modal'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {mode.value === 'feature' && featureDraft.value && (
              <button className="btn danger small" onClick={handleDelete}>Delete</button>
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
                    <button className="btn danger small" onClick={handleDelete}>Delete</button>
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
                  selectedItemIndex={treeSelection.value?.type === 'feature' ? treeSelection.value.itemIndex : undefined}
                  onUpdate={updateFeatureDraft}
                  onUpdateItem={updateFeatureItem}
                  onRemoveItem={handleRemoveItem}
                  onSelectItem={(itemIndex) => {
                    if (treeSelection.value?.type === 'feature') {
                      treeSelection.value = { ...treeSelection.value, itemIndex };
                    }
                  }}
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
                Raw JSON view (read-only).
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
                  options={{
                    readOnly: true,
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

      {/* Map Preview Panel (Side) */}
      {(mode.value === 'layer' || mode.value === 'feature') && showPreview.value && !previewInModal.value && (
        <>
          {/* Preview Resize Handle */}
          <div
            className={`w-1.5 cursor-col-resize flex-shrink-0 group hover:bg-blue-500/50 transition-colors ${
              isPreviewResizing.value ? 'bg-blue-500/50' : ''
            }`}
            onMouseDown={handlePreviewMouseDown as any}
          >
            <div className={`w-0.5 h-full mx-auto ${isPreviewResizing.value ? 'bg-blue-500' : 'bg-transparent group-hover:bg-blue-500'}`} />
          </div>

          {/* Preview Panel */}
          <div
            style={{ width: previewWidth.value }}
            className="flex-shrink-0 h-full bg-slate-800 border border-slate-700 rounded-xl overflow-hidden ml-1.5"
          >
            <MapPreviewPanel
              layer={mode.value === 'layer' ? layerDraft.value : null}
              feature={mode.value === 'feature' ? featureDraft.value?.feature : null}
              selectedSublayerIndex={selectedSublayerIndex.value}
              mode={mode.value === 'layer' ? 'layer' : 'feature'}
            />
          </div>
        </>
      )}

      {/* Map Preview (Modal) */}
      {(mode.value === 'layer' || mode.value === 'feature') && showPreview.value && previewInModal.value && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => previewInModal.value = false}
        >
          <div
            className="bg-slate-800 border border-slate-600 rounded-xl w-[95vw] h-[90vh] max-w-[1400px] flex flex-col shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-2 border-b border-slate-700 flex items-center justify-between bg-slate-800/80 flex-shrink-0">
              <div className="text-sm font-medium text-slate-200">Map Preview</div>
              <button
                className="text-slate-400 hover:text-white text-xl leading-none"
                onClick={() => previewInModal.value = false}
              >
                ×
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <MapPreviewPanel
                layer={mode.value === 'layer' ? layerDraft.value : null}
                feature={mode.value === 'feature' ? featureDraft.value?.feature : null}
                selectedSublayerIndex={selectedSublayerIndex.value}
                mode={mode.value === 'layer' ? 'layer' : 'feature'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Layer Creator Modal */}
      <QuickLayerModal
        isOpen={layerCreatorItemIndex.value !== null}
        onClose={() => layerCreatorItemIndex.value = null}
        onCreateLayer={handleQuickCreateLayer}
      />

      {/* Feature Creator Modal */}
      <FeatureCreatorModal
        isOpen={featureCreatorOpen.value !== null}
        initialFeatureType={featureCreatorOpen.value || 'weatherFeatures'}
        onClose={() => featureCreatorOpen.value = null}
        onCreate={handleFeatureCreated}
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
