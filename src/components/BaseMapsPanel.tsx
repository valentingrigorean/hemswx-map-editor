import { useSignal, useComputed } from '@preact/signals';
import { useCallback, useRef, useState } from 'preact/hooks';
import {
  jsonData,
  selectedBasemap,
  selectBasemap,
  updateJsonData,
  setStatus,
  deleteBasemapByIndex,
  addBasemap,
} from '../lib/jsonStore';
import {
  BaseMapEntity,
  MapLayerEntity,
  MapCountry,
  UnitType,
} from '../lib/types';
import CollapsibleSection from './ui/CollapsibleSection';
import ConfirmDialog, { useConfirmDialog } from './ui/ConfirmDialog';
import MapLayerModal from './workspace/MapLayerModal';
import MapPreviewPanel from './workspace/MapPreviewPanel';
import ConfigHeader from './ui/ConfigHeader';
import Tabs from './ui/Tabs';
import TranslationForm from './ui/TranslationForm';

function getThumbnailSrc(basemap: BaseMapEntity): string | null {
  if (basemap.thumbnailBase64) {
    if (basemap.thumbnailBase64.startsWith('data:')) {
      return basemap.thumbnailBase64;
    }
    return `data:image/png;base64,${basemap.thumbnailBase64}`;
  }
  if (basemap.thumbnailUrl) {
    return basemap.thumbnailUrl;
  }
  return null;
}

const MIN_NAV_WIDTH = 200;
const MAX_NAV_WIDTH_PERCENT = 0.35;
const DEFAULT_NAV_WIDTH = 280;
const NAV_WIDTH_STORAGE_KEY = 'hemswx-basemaps-nav-width';

const MIN_PREVIEW_WIDTH = 250;
const MAX_PREVIEW_WIDTH_PERCENT = 0.4;
const DEFAULT_PREVIEW_WIDTH = 400;
const PREVIEW_WIDTH_STORAGE_KEY = 'hemswx-basemaps-preview-width';
const PREVIEW_VISIBLE_STORAGE_KEY = 'hemswx-basemaps-preview-visible';

const COUNTRIES: { code: MapCountry; label: string }[] = [
  { code: 'world', label: 'World' },
  { code: 'no', label: 'Norway' },
  { code: 'se', label: 'Sweden' },
  { code: 'dk', label: 'Denmark' },
  { code: 'fi', label: 'Finland' },
];

const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: 'metric', label: 'Metric' },
  { value: 'aviation', label: 'Aviation' },
  { value: 'nautical', label: 'Nautical' },
];

const getStoredNavWidth = (): number => {
  try {
    const stored = localStorage.getItem(NAV_WIDTH_STORAGE_KEY);
    if (stored) {
      const width = parseInt(stored, 10);
      if (!isNaN(width) && width >= MIN_NAV_WIDTH) return width;
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
      if (!isNaN(width) && width >= MIN_PREVIEW_WIDTH) return width;
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

function getDefaultMapLayer(): MapLayerEntity {
  return {
    type: 'vectorTiled',
    source: '',
    sourceKind: 'uri',
  };
}

function getDefaultBasemap(): BaseMapEntity {
  return {
    id: '',
    name: '',
    countries: [],
    unitType: undefined,
    baseLayers: [],
    referenceLayers: [],
  };
}

interface LayerListItemProps {
  layer: MapLayerEntity;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function LayerListItem({ layer, index, onEdit, onRemove, onMoveUp, onMoveDown }: LayerListItemProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all border-l border-slate-700 hover:bg-slate-700/50 text-slate-400 group">
      <div className={`w-3.5 h-3.5 border border-slate-500 flex items-center justify-center flex-shrink-0 rounded-sm bg-slate-800`}>
        <span className="text-[8px]">{index + 1}</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{layer.type.toUpperCase()} - {layer.source.substring(0, 30)}...</div>
      </div>

       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
         <button className="text-xs px-1 hover:bg-slate-600 rounded" onClick={onEdit}>Edit</button>
         <button className="text-xs px-1 hover:bg-red-900/50 text-red-400 rounded" onClick={onRemove}>×</button>
          <div className="flex flex-col gap-0">
           {onMoveUp && (
            <button className="text-[8px] leading-none hover:text-white" onClick={onMoveUp}>▲</button>
           )}
            {onMoveDown && (
              <button className="text-[8px] leading-none hover:text-white" onClick={onMoveDown}>▼</button>
            )}
         </div>
      </div>
    </div>
  );
}

export default function BaseMapsPanel() {
  const navWidth = useSignal(getStoredNavWidth());
  const isResizing = useSignal(false);
  const previewWidth = useSignal(getStoredPreviewWidth());
  const isPreviewResizing = useSignal(false);
  const showPreview = useSignal(getStoredPreviewVisible());
  const containerRef = useRef<HTMLDivElement>(null);
  const confirmDialog = useConfirmDialog();

  const basemaps = useComputed(() => jsonData.value.baseMaps || []);
  const selectedIndex = useComputed(() => selectedBasemap.value.index);
  const currentBasemap = useComputed(() => {
    const idx = selectedIndex.value;
    if (idx < 0 || idx >= basemaps.value.length) return null;
    return basemaps.value[idx];
  });

  const isNewItem = useSignal(false);
  const draft = useSignal<BaseMapEntity | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'layers' | 'translations'>('general');

  const activeBasemap = useComputed(() => {
    if (isNewItem.value) return draft.value;
    return currentBasemap.value;
  });

  // Layer modal state
  const layerModal = useSignal<{
    open: boolean;
    layerType: 'base' | 'reference';
    editIndex: number | null;
    layer?: MapLayerEntity;
  }>({ open: false, layerType: 'base', editIndex: null });

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
    savePreviewVisible(next);
  }, []);

  const handleSelectBasemap = (index: number) => {
    selectBasemap(index);
    isNewItem.value = false;
    draft.value = JSON.parse(JSON.stringify(basemaps.value[index]));
    setActiveTab('general');
  };

  const handleNewBasemap = () => {
    selectBasemap(-1);
    isNewItem.value = true;
    draft.value = getDefaultBasemap();
    setActiveTab('general');
  };

  const handleSave = () => {
    if (!draft.value) return;

    if (!draft.value.id.trim()) {
      setStatus('Basemap ID is required');
      return;
    }
    if (!draft.value.name.trim()) {
      setStatus('Basemap name is required');
      return;
    }
    if (draft.value.baseLayers.length === 0) {
      setStatus('At least one base layer is required');
      return;
    }

    if (isNewItem.value) {
      const existing = basemaps.value.find(b => b.id === draft.value!.id);
      if (existing) {
        setStatus(`Basemap with ID "${draft.value.id}" already exists`);
        return;
      }
      addBasemap(draft.value);
      selectBasemap(basemaps.value.length);
      isNewItem.value = false;
    } else if (selectedIndex.value >= 0) {
      const updated = { ...jsonData.value };
      if (!updated.baseMaps) updated.baseMaps = [];
      updated.baseMaps = updated.baseMaps.map((b, i) =>
        i === selectedIndex.value ? draft.value! : b
      );
      updateJsonData(updated);
      setStatus('Basemap updated');
    }
  };

  const handleCancel = () => {
    if (isNewItem.value) {
      selectBasemap(-1);
      draft.value = null;
      isNewItem.value = false;
    } else if (selectedIndex.value >= 0) {
      draft.value = JSON.parse(JSON.stringify(basemaps.value[selectedIndex.value]));
    }
  };

  const handleDelete = () => {
    if (selectedIndex.value < 0 || !currentBasemap.value) return;

    confirmDialog.confirm({
      title: 'Delete Basemap',
      message: `Are you sure you want to delete "${currentBasemap.value.name || currentBasemap.value.id}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        deleteBasemapByIndex(selectedIndex.value);
        draft.value = null;
        isNewItem.value = false;
      }
    });
  };


  const updateDraft = (changes: Partial<BaseMapEntity>) => {
    if (!draft.value) return;
    draft.value = { ...draft.value, ...changes };
  };

  // Layer management
  const openAddLayerModal = (layerType: 'base' | 'reference') => {
    layerModal.value = { open: true, layerType, editIndex: null };
  };

  const openEditLayerModal = (layerType: 'base' | 'reference', index: number) => {
    if (!draft.value) return;
    const layers = layerType === 'base' ? draft.value.baseLayers : draft.value.referenceLayers;
    layerModal.value = { open: true, layerType, editIndex: index, layer: layers[index] };
  };

  const handleLayerModalSave = (layer: MapLayerEntity) => {
    if (!draft.value) return;
    const { layerType, editIndex } = layerModal.value;

    if (layerType === 'base') {
      const layers = [...draft.value.baseLayers];
      if (editIndex !== null) {
        layers[editIndex] = layer;
      } else {
        layers.push(layer);
      }
      draft.value = { ...draft.value, baseLayers: layers };
    } else {
      const layers = [...draft.value.referenceLayers];
      if (editIndex !== null) {
        layers[editIndex] = layer;
      } else {
        layers.push(layer);
      }
      draft.value = { ...draft.value, referenceLayers: layers };
    }

    layerModal.value = { open: false, layerType: 'base', editIndex: null };
  };

  const removeLayer = (layerType: 'base' | 'reference', index: number) => {
    if (!draft.value) return;
    if (layerType === 'base') {
      draft.value = {
        ...draft.value,
        baseLayers: draft.value.baseLayers.filter((_, i) => i !== index)
      };
    } else {
      draft.value = {
        ...draft.value,
        referenceLayers: draft.value.referenceLayers.filter((_, i) => i !== index)
      };
    }
  };

  const moveLayer = (layerType: 'base' | 'reference', fromIndex: number, toIndex: number) => {
    if (!draft.value) return;
    const layers = layerType === 'base' ? [...draft.value.baseLayers] : [...draft.value.referenceLayers];
    const [moved] = layers.splice(fromIndex, 1);
    layers.splice(toIndex, 0, moved);
    if (layerType === 'base') {
      draft.value = { ...draft.value, baseLayers: layers };
    } else {
      draft.value = { ...draft.value, referenceLayers: layers };
    }
  };

  return (
    <div ref={containerRef} className="flex h-full">
      {/* Left Panel - Basemap List (Sidebar style) */}
      <div style={{ width: navWidth.value }} className="flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Header - Matching Navigator style */}
        <div className="flex flex-col gap-2 p-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300">Basemap Manager</h3>
            <div className="flex gap-1">
              <button
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400"
                onClick={handleNewBasemap}
                title="New Basemap"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2 space-y-1">
          {basemaps.value.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">
              No basemaps defined.
              <br />
              <button className="text-blue-400 hover:text-blue-300 mt-2" onClick={handleNewBasemap}>
                Add your first basemap
              </button>
            </div>
          ) : (
            basemaps.value.map((basemap, index) => {
              const thumbSrc = getThumbnailSrc(basemap);
              // Use TreeItem style for consistency?
              // The user asked for "Add New" positioning.
              // I'll keep the list items similar to before but cleaner, or try to match TreeItem style from Navigator if possible.
              // Navigator uses `TreeItem`.
              const isSelected = selectedIndex.value === index && !isNewItem.value;
              return (
                <div
                  key={basemap.id}
                  className={`w-full text-left px-2 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/20 text-blue-200 border border-blue-500/50'
                      : 'hover:bg-slate-800 text-slate-300 border border-transparent'
                  }`}
                  onClick={() => handleSelectBasemap(index)}
                >
                  {thumbSrc ? (
                    <img
                      src={thumbSrc}
                      alt=""
                      className="w-10 h-8 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-8 rounded bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-slate-400">Map</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{basemap.name || basemap.id}</div>
                    <div className="text-xs opacity-70 truncate">
                      {basemap.baseLayers.length} layer{basemap.baseLayers.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className={`w-1 cursor-col-resize flex-shrink-0 group hover:bg-blue-500/50 transition-colors bg-slate-900 border-l border-r border-slate-800 ${
          isResizing.value ? 'bg-blue-500/50' : ''
        }`}
        onMouseDown={handleMouseDown as any}
      />

      {/* Right Panel - Editor */}
      <div className="flex-1 min-w-0 bg-slate-900 flex flex-col overflow-hidden">
        {draft.value ? (
          <div className="flex flex-col h-full p-4">
            <ConfigHeader
              title={isNewItem.value ? 'New Basemap' : draft.value.name || draft.value.id || 'Basemap'}
              id={draft.value.id}
              isNew={isNewItem.value}
              showPreview={showPreview.value}
              onTogglePreview={togglePreview}
              onSave={handleSave}
              onCancel={handleCancel}
              onDelete={!isNewItem.value ? handleDelete : undefined}
            />

            {/* Tabs */}
            <Tabs
              tabs={[
                { id: 'general', label: 'General' },
                { id: 'layers', label: 'Layers' },
                { id: 'translations', label: 'Translations' }
              ]}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as any)}
            />

            {/* Content */}
            <div className="flex-1 overflow-auto space-y-4">
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label">ID <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        value={activeBasemap.value.id}
                        onChange={(e) => handleUpdate({ id: (e.target as HTMLInputElement).value })}
                        placeholder="e.g. standard, nautical"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Name <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        value={draft.value.name}
                        onChange={(e) => updateDraft({ name: (e.target as HTMLInputElement).value })}
                        placeholder="Display name"
                      />
                    </div>
                  </div>

                  <div className="form-group mt-3">
                    <label className="form-label">Unit Type</label>
                    <div className="flex flex-wrap gap-2">
                      {UNIT_TYPES.map(ut => {
                        const isSelected = activeBasemap.value!.unitType === ut.value;
                        return (
                          <button
                            key={ut.value}
                            type="button"
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                : 'bg-transparent text-slate-300 border-slate-600 hover:border-slate-500'
                            }`}
                            onClick={() => {
                              handleUpdate({ unitType: isSelected ? undefined : ut.value });
                            }}
                          >
                            {ut.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-group mt-3">
                    <label className="form-label">Thumbnail</label>
                    <div className="flex gap-4 items-start">
                      {/* Preview */}
                      <div className="flex-shrink-0">
                        {getThumbnailSrc(draft.value) ? (
                          <img
                            src={getThumbnailSrc(draft.value)!}
                            alt="Thumbnail preview"
                            className="w-28 h-20 rounded-lg object-cover border border-slate-600"
                          />
                        ) : (
                          <div className="w-28 h-20 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center">
                            <span className="text-xs text-slate-500">No image</span>
                          </div>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <label className="btn tiny cursor-pointer">
                            Upload Image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const base64 = (reader.result as string).split(',')[1];
                                  updateDraft({
                                    thumbnailBase64: base64,
                                    thumbnailUrl: undefined
                                  });
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                          {(draft.value.thumbnailBase64 || draft.value.thumbnailUrl) && (
                            <button
                              className="btn tiny danger"
                              onClick={() => updateDraft({
                                thumbnailBase64: undefined,
                                thumbnailUrl: undefined
                              })}
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        <div className="text-xs text-slate-500">Or enter URL:</div>
                        <input
                          type="text"
                          className="form-input text-sm"
                          value={draft.value.thumbnailUrl || ''}
                          onChange={(e) => {
                            const val = (e.target as HTMLInputElement).value;
                            updateDraft({
                              thumbnailUrl: val || undefined,
                              thumbnailBase64: val ? undefined : draft.value!.thumbnailBase64
                            });
                          }}
                          placeholder="https://..."
                          disabled={!!draft.value.thumbnailBase64}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group mt-3">
                    <label className="form-label">Countries</label>
                    <div className="flex flex-wrap gap-2">
                      {COUNTRIES.map(c => {
                        const isSelected = (draft.value?.countries || []).includes(c.code);
                        return (
                          <button
                            key={c.code}
                            type="button"
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                : 'bg-transparent text-slate-300 border-slate-600 hover:border-slate-500'
                            }`}
                            onClick={() => {
                              const current = draft.value?.countries || [];
                              if (isSelected) {
                                updateDraft({ countries: current.filter(x => x !== c.code) });
                              } else {
                                updateDraft({ countries: [...current, c.code] });
                              }
                            }}
                          >
                            {c.code.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Select specific countries or leave empty for all.
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'layers' && (
                <div className="space-y-6">
                  {/* Base Layers */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-slate-300">Base Layers</h3>
                      <button className="btn tiny" onClick={() => openAddLayerModal('base')}>+ Add Layer</button>
                    </div>
                    
                    {draft.value.baseLayers.length === 0 ? (
                      <div className="text-center text-slate-500 text-sm py-4 border border-dashed border-slate-600 rounded">
                        No base layers. At least one is required.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {draft.value.baseLayers.map((layer, idx) => (
                          <LayerListItem
                            key={idx}
                            layer={layer}
                            index={idx}
                            onEdit={() => openEditLayerModal('base', idx)}
                            onRemove={() => removeLayer('base', idx)}
                            onMoveUp={idx > 0 ? () => moveLayer('base', idx, idx - 1) : undefined}
                            onMoveDown={idx < draft.value!.baseLayers.length - 1 ? () => moveLayer('base', idx, idx + 1) : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reference Layers */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-slate-300">Reference Layers</h3>
                      <button className="btn tiny" onClick={() => openAddLayerModal('reference')}>+ Add Layer</button>
                    </div>
                    
                    {draft.value.referenceLayers.length === 0 ? (
                      <div className="text-center text-slate-500 text-sm py-4 border border-dashed border-slate-600 rounded">
                        No reference layers (optional).
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {draft.value.referenceLayers.map((layer, idx) => (
                          <LayerListItem
                            key={idx}
                            layer={layer}
                            index={idx}
                            onEdit={() => openEditLayerModal('reference', idx)}
                            onRemove={() => removeLayer('reference', idx)}
                            onMoveUp={idx > 0 ? () => moveLayer('reference', idx, idx - 1) : undefined}
                            onMoveDown={idx < draft.value!.referenceLayers.length - 1 ? () => moveLayer('reference', idx, idx + 1) : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'translations' && (
                <div className="space-y-6">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <TranslationForm
                      translationKey={draft.value.id}
                      label={`Basemap Name Translations (ID: ${draft.value.id || 'none'})`}
                      hint="Ensure the Basemap ID is set in the General tab first."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <p className="mb-4">Select a basemap or create a new one</p>
              <button className="btn primary" onClick={handleNewBasemap}>
                New Basemap
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Preview Panel */}
      {draft.value && showPreview.value && (
        <>
          {/* Preview Resize Handle */}
          <div
            className={`w-1 cursor-col-resize flex-shrink-0 group hover:bg-blue-500/50 transition-colors bg-slate-900 border-l border-r border-slate-800 ${
              isPreviewResizing.value ? 'bg-blue-500/50' : ''
            }`}
            onMouseDown={handlePreviewMouseDown as any}
          />

          {/* Preview Panel */}
          <div
            style={{ width: previewWidth.value }}
            className="flex-shrink-0 bg-slate-900 overflow-hidden"
          >
            <MapPreviewPanel
              basemap={draft.value}
              mode="basemap"
            />
          </div>
        </>
      )}

      {/* Layer Modal */}
      <MapLayerModal
        isOpen={layerModal.value.open}
        onClose={() => layerModal.value = { open: false, layerType: 'base', editIndex: null }}
        onSave={handleLayerModalSave}
        initialLayer={layerModal.value.layer}
        title={layerModal.value.editIndex !== null
          ? `Edit ${layerModal.value.layerType === 'base' ? 'Base' : 'Reference'} Layer`
          : `Add ${layerModal.value.layerType === 'base' ? 'Base' : 'Reference'} Layer`
        }
        saveLabel={layerModal.value.editIndex !== null ? 'Save' : 'Add'}
      />

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