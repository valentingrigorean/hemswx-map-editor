import { useComputed, useSignal } from '@preact/signals';
import { useMemo } from 'preact/hooks';
import {
  jsonData,
  selectedLayer,
  selectedLayerData,
  updateJsonData,
  selectLayer,
  setStatus,
  layerDrafts,
  getLayerDraft,
  setLayerDraft,
  clearLayerDraft,
  deleteLayerByIndex
} from '../lib/jsonStore';
import { LayerConfig, LayerType, LayerEntry } from '../lib/types';
import {
  getDefaultLayerConfig,
  getDefaultLayerEntry,
  LAYER_TYPES,
  validateLayerEntry,
  upsertLayerEntry
} from '../lib/layers';
import { getLayerUsage } from '../lib/utils';
import { isCustomLogicLayer } from '../lib/settings';
import JsonEditor from './JsonEditor';
import ValidationDisplay from './ValidationDisplay';

const DETAIL_TABS = [
  { id: 'details', label: 'Details' },
  { id: 'json', label: 'JSON' }
] as const;

export default function LayerDetailsPanel() {
  const currentIndex = useComputed(() => selectedLayer.value.index);
  const currentEntry = selectedLayerData; // LayerEntry | null
  const activeDetailTab = useSignal<'details' | 'json'>('details');

  const draftKey = useComputed<number | null>(() => (currentIndex.value >= 0 ? currentIndex.value : null));

  const draftEntry = useComputed<LayerEntry | null>(() => {
    if (draftKey.value === null) return null;
    return getLayerDraft(draftKey.value) || null;
  });

  const hasNewDraft = useComputed(() => !!(layerDrafts.value['new'] as LayerEntry | undefined));

  const isEditing = useComputed(() => hasNewDraft.value || draftEntry.value != null);
  const workingEntry = useComputed<LayerEntry | null>(() => {
    const newDraft = layerDrafts.value['new'] as LayerEntry | undefined;
    if (newDraft) return newDraft;
    if (draftEntry.value) return draftEntry.value;
    return currentEntry.value || null;
  });

  const validation = useComputed(() => {
    const entry = workingEntry.value;
    if (!entry) return null;
    return validateLayerEntry(entry);
  });

  const startNew = () => {
    const fresh: LayerEntry = { id: '', layers: [] };
    setLayerDraft('new', fresh);
    selectLayer(-1);
  };

  const beginEdit = () => {
    if (currentIndex.value < 0 || !currentEntry.value) return;
    setLayerDraft(currentIndex.value, { ...(currentEntry.value as LayerEntry) });
  };

  const applySave = () => {
    const useNew = hasNewDraft.value;
    const key = useNew ? 'new' : (draftKey.value as number);
    const draft = (useNew ? layerDrafts.value['new'] : layerDrafts.value[key]) as LayerEntry | undefined;
    if (!draft) return;

    const validation = validateLayerEntry(draft);
    if (!validation.valid) {
      validationErrors.value = validation.errors;
      setStatus(`❌ Layer validation failed: ${validation.errors[0]}`);
      return;
    }

    const updatedData = upsertLayerEntry(jsonData.value, draft);
    updateJsonData(updatedData);

    const newIndex = updatedData.layers.findIndex((l) => l.id === draft.id);
    if (newIndex >= 0) selectLayer(newIndex);

    clearLayerDraft('new');
    if (!useNew && typeof key === 'number') clearLayerDraft(key);
    setStatus('✅ Layer saved successfully');
  };

  const cancelEdit = () => {
    clearLayerDraft('new');
    if (typeof draftKey.value === 'number') clearLayerDraft(draftKey.value);
  };

  const handleDelete = () => {
    if (currentIndex.value < 0 || !currentEntry.value) return;

    const layerName = currentEntry.value.id || `Layer ${currentIndex.value + 1}`;
    if (confirm(`Are you sure you want to delete layer "${layerName}"? This action cannot be undone.`)) {
      deleteLayerByIndex(currentIndex.value);
    }
  };

  const handleDuplicate = () => {
    if (currentIndex.value < 0 || !currentEntry.value) return;

    const original = currentEntry.value as LayerEntry;
    const duplicated: LayerEntry = {
      id: `${original.id}_copy`,
      layers: JSON.parse(JSON.stringify(original.layers || []))
    };

    setLayerDraft('new', duplicated);
    selectLayer(-1);
  };

  const updateDraft = (updates: Partial<LayerEntry>) => {
    const useNew = hasNewDraft.value || draftKey.value === null;
    const key = useNew ? 'new' : (draftKey.value as number);
    const base: LayerEntry = (useNew ? layerDrafts.value['new'] : layerDrafts.value[key]) as LayerEntry;
    const next = { ...base, ...updates } as LayerEntry;
    setLayerDraft(key, next);
  };

  const updateSublayer = (index: number, updates: Partial<LayerConfig>) => {
    const useNew = hasNewDraft.value || draftKey.value === null;
    const key = useNew ? 'new' : (draftKey.value as number);
    const base: LayerEntry = (useNew ? layerDrafts.value['new'] : layerDrafts.value[key]) as LayerEntry;
    const nextLayers = [...(base.layers || [])];
    nextLayers[index] = { ...nextLayers[index], ...updates } as LayerConfig;
    setLayerDraft(key, { ...base, layers: nextLayers });
  };

  const removeSublayer = (index: number) => {
    const useNew = hasNewDraft.value || draftKey.value === null;
    const key = useNew ? 'new' : (draftKey.value as number);
    const base: LayerEntry = (useNew ? layerDrafts.value['new'] : layerDrafts.value[key]) as LayerEntry;
    const nextLayers = [...(base.layers || [])];
    nextLayers.splice(index, 1);
    setLayerDraft(key, { ...base, layers: nextLayers });
  };

  const addSublayer = (type: LayerType = 'wms') => {
    const useNew = hasNewDraft.value || draftKey.value === null;
    const key = useNew ? 'new' : (draftKey.value as number);
    const base: LayerEntry = (useNew ? layerDrafts.value['new'] : layerDrafts.value[key]) as LayerEntry;
    // Start blank to make new flow similar to edit (empty fields)
    const blank: LayerConfig = { type, source: '', zIndex: 0, options: { opacity: 1 } } as LayerConfig;
    const nextLayers = [...(base.layers || []), blank];
    setLayerDraft(key, { ...base, layers: nextLayers });
  };

  const handleJsonChange = (next: LayerEntry) => {
    // Ensure we are in editing mode; create draft if needed
    if (currentEntry.value && draftKey.value === currentIndex.value && !draftEntry.value && !hasNewDraft.value) {
      setLayerDraft(currentIndex.value, { ...(currentEntry.value as LayerEntry) });
    }
    const useNew = hasNewDraft.value || draftKey.value === null;
    const key = useNew ? 'new' : (draftKey.value as number);
    setLayerDraft(key, next);
  };

  const canEdit = useComputed(() => currentIndex.value >= 0 && !!currentEntry.value);

  const layerUsage = useComputed(() => {
    if (!currentEntry.value?.id) return [];
    return getLayerUsage(jsonData.value, currentEntry.value.id);
  });

  const hasCustomLogic = useComputed(() => {
    return currentEntry.value?.id ? isCustomLogicLayer(currentEntry.value.id) : false;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header with Edit controls */}
      <div className="flex flex-wrap gap-2 mb-3 items-center flex-shrink-0">
        <div>
          <span className="text-slate-500">
            {isEditing.value ? (currentIndex.value >= 0 ? 'Edit Layer' : 'New Layer') : 'Layer Details'}
          </span>
          {workingEntry.value && (
            <div className="text-xs text-slate-400 mt-0.5">
              {workingEntry.value.id}
              {hasCustomLogic.value && !isEditing.value && (
                <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                  Referenced
                </span>
              )}
            </div>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          {!isEditing.value && canEdit.value && (
            <>
              <button className="btn small" onClick={beginEdit}>Edit</button>
              <button className="btn ghost small" onClick={handleDuplicate}>Duplicate</button>
              <button className="btn danger small" onClick={handleDelete}>Delete</button>
            </>
          )}
          <button className="btn primary small" onClick={startNew}>New Layer</button>
          {isEditing.value && (
            <>
              <button className="btn success small" onClick={applySave}>Save</button>
              <button className="btn ghost small" onClick={cancelEdit}>Cancel</button>
            </>
          )}
        </div>
      </div>


      {!workingEntry.value ? (
        <div className="text-center p-5 text-slate-500 flex-1 flex items-center justify-center">
          <div>
            <p>Select a layer to view/edit or create a new one</p>
            <button className="btn primary" onClick={startNew}>New Layer</button>
          </div>
        </div>
      ) : (
        <>
          {/* Detail Tabs */}
          <div className="flex gap-1 mb-3 border-b border-slate-700 pb-2 flex-shrink-0">
            {DETAIL_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`px-3 py-1.5 rounded-t-md text-xs transition-all duration-150 ${
                  activeDetailTab.value === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-950 text-slate-500 border border-slate-700 hover:border-slate-600 hover:text-slate-200'
                }`}
                onClick={() => (activeDetailTab.value = tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeDetailTab.value === 'details' && (
              <div className="h-full overflow-auto">
                <ValidationDisplay validation={validation.value} className="mb-4" />
                
                <div className="layer-section">
                  <div className="form-group">
                    <label className="form-label">Layer ID</label>
                    <input
                      type="text"
                      className="form-input"
                      value={workingEntry.value.id}
                      onChange={(e) => updateDraft({ id: (e.target as HTMLInputElement).value })}
                      onBlur={(e) => {
                        const newId = (e.target as HTMLInputElement).value.trim();
                        if (!newId) return;
                        
                        // Check for duplicate IDs
                        const existingLayers = jsonData.value.layers || [];
                        const isDuplicate = existingLayers.some((layer, index) => 
                          layer.id === newId && index !== currentIndex.value
                        );
                        
                        if (isDuplicate) {
                          setStatus(`❌ Layer ID "${newId}" already exists. Please choose a unique ID.`);
                          // Generate a unique ID suggestion
                          let counter = 1;
                          let suggestedId = `${newId}_${counter}`;
                          while (existingLayers.some(layer => layer.id === suggestedId)) {
                            counter++;
                            suggestedId = `${newId}_${counter}`;
                          }
                          updateDraft({ id: suggestedId });
                          (e.target as HTMLInputElement).value = suggestedId;
                        }
                      }}
                      placeholder="unique_layer_id"
                      disabled={!isEditing.value}
                    />
                  </div>
                </div>

                {/* Sublayers list */}
                <div className="layer-section">
                  <div className="flex items-center justify-between mb-2">
                    <label className="form-label">Sublayers</label>
                    {isEditing.value && (
                      <button className="btn small" onClick={() => addSublayer('wms')}>+ Add Sublayer</button>
                    )}
                  </div>

                  {workingEntry.value.layers.length === 0 && (
                    <div className="text-slate-500 text-sm">No sublayers. Add one to get started.</div>
                  )}

                  <div className="space-y-2">
                    {workingEntry.value.layers.map((layer, index) => (
                      <div
                        key={index}
                        className="border border-slate-600 rounded p-3 bg-slate-900"
                        draggable={isEditing.value && workingEntry.value.layers.length > 1}
                        onDragStart={(e) => {
                          if (!isEditing.value) return;
                          e.dataTransfer.setData('text/plain', index.toString());
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          if (!isEditing.value) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          if (!isEditing.value) return;
                          e.preventDefault();
                          const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                          if (draggedIndex !== index) {
                            const base = workingEntry.value as LayerEntry;
                            const nextLayers = [...(base.layers || [])];
                            const dragged = nextLayers[draggedIndex];
                            nextLayers.splice(draggedIndex, 1);
                            nextLayers.splice(index, 0, dragged);
                            updateDraft({ layers: nextLayers });
                          }
                        }}
                        style={{
                          cursor: isEditing.value && workingEntry.value.layers.length > 1 ? 'grab' : 'default'
                        }}
                      >
                        <div className="mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            {isEditing.value && workingEntry.value.layers.length > 1 && (
                              <div className="cursor-move text-slate-400 hover:text-slate-300 px-1 select-none" title="Drag to reorder">
                                ⋮⋮
                              </div>
                            )}
                            <span className="text-xs text-slate-400 font-mono">#{index + 1}</span>
                            <div className="flex-1 text-sm font-medium">
                              {layer.type.toUpperCase()}
                            </div>
                            {isEditing.value && (
                              <button className="btn tiny danger" onClick={() => removeSublayer(index)}>×</button>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 break-all pl-6">
                            {layer.source || 'No source'}
                          </div>
                          {!isEditing.value && (
                            <div className="text-xs text-slate-500 pl-6 mt-1 space-y-0.5">
                              {layer.options?.opacity !== undefined && layer.options.opacity !== 1 && (
                                <div>Opacity: {layer.options.opacity}</div>
                              )}
                              {layer.zIndex !== undefined && layer.zIndex !== 0 && (
                                <div>Z-Index: {layer.zIndex}</div>
                              )}
                              {layer.refreshInterval && (
                                <div>Refresh: {layer.refreshInterval}ms ({(layer.refreshInterval / 1000).toFixed(1)}s)</div>
                              )}
                            </div>
                          )}
                        </div>

                        {isEditing.value && (
                          <div className="space-y-2 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-slate-400 mb-1">Type</label>
                                <select
                                  className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded"
                                  value={layer.type}
                                  onChange={(e) => {
                                    const type = (e.target as HTMLSelectElement).value as LayerType;
                                    const defaults = getDefaultLayerConfig(type);
                                    
                                    // Clean options - only keep generic ones and type-specific ones
                                    const oldOptions = layer.options || {};
                                    const cleanOptions: any = {};
                                    
                                    // Always preserve these generic options
                                    if (oldOptions.opacity !== undefined) cleanOptions.opacity = oldOptions.opacity;
                                    
                                    // Add type-specific options from defaults
                                    if (type === 'wms' && defaults.options?.layerNames) {
                                      cleanOptions.layerNames = defaults.options.layerNames;
                                    } else if (type === 'portalItem' && defaults.options?.layerId !== undefined) {
                                      cleanOptions.layerId = defaults.options.layerId;
                                    }
                                    
                                    // Preserve any truly custom options (not type-specific ones)
                                    Object.entries(oldOptions).forEach(([key, value]) => {
                                      if (key !== 'layerNames' && key !== 'layerId' && key !== 'opacity') {
                                        cleanOptions[key] = value;
                                      }
                                    });
                                    
                                    updateSublayer(index, { type, source: layer.source, options: cleanOptions });
                                  }}
                                >
                                  {LAYER_TYPES.map((t) => (
                                    <option key={t} value={t}>{t.toUpperCase()}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-slate-400 mb-1">Opacity</label>
                                <input
                                  type="text"
                                  className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded"
                                  placeholder="0.0 - 1.0"
                                  defaultValue={layer.options?.opacity ?? 1}
                                  onBlur={(e) => {
                                    // Support both "." and "," as decimal separators
                                    const rawValue = (e.target as HTMLInputElement).value.replace(',', '.');
                                    let opacity = parseFloat(rawValue);
                                    if (isNaN(opacity) || rawValue.trim() === '') opacity = 1;
                                    if (opacity < 0) opacity = 0;
                                    if (opacity > 1) opacity = 1;
                                    updateSublayer(index, { options: { ...layer.options, opacity } });
                                    // Update the input to show the clamped value with dot notation
                                    (e.target as HTMLInputElement).value = opacity.toString();
                                  }}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-slate-400 mb-1">Z-Index</label>
                                <input
                                  type="number"
                                  className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded"
                                  value={layer.zIndex ?? 0}
                                  onChange={(e) => updateSublayer(index, { zIndex: parseInt((e.target as HTMLInputElement).value) })}
                                />
                              </div>
                              <div>
                                <label className="block text-slate-400 mb-1">Refresh Interval (ms)</label>
                                <input
                                  type="number"
                                  className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded"
                                  value={layer.refreshInterval || ''}
                                  onChange={(e) => {
                                    const value = (e.target as HTMLInputElement).value;
                                    updateSublayer(index, { refreshInterval: value ? parseInt(value) : undefined });
                                  }}
                                  placeholder="60000"
                                  min="0"
                                  step="1000"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-slate-400 mb-1">Source URL/ID</label>
                              <input
                                type="text"
                                className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded"
                                value={layer.source || ''}
                                onChange={(e) => updateSublayer(index, { source: (e.target as HTMLInputElement).value })}
                                placeholder={
                                  layer.type === 'portalItem' ? 'e.g. abc123def456' :
                                  layer.type === 'wms' ? 'https://example.com/wms' :
                                  layer.type === 'tiled' ? 'https://example.com/tiles/{z}/{y}/{x}.png' :
                                  layer.type === 'vectorTiled' ? 'https://example.com/vectortiles/{z}/{y}/{x}.pbf' :
                                  layer.type === 'feature' ? 'https://example.com/arcgis/rest/services/FeatureServer/0' :
                                  'https://example.com/arcgis/rest/services/MapServer'
                                }
                              />
                              <div className="text-[10px] text-slate-500 mt-1">
                                {layer.type === 'portalItem' && 'ArcGIS Online portal item ID'}
                                {layer.type === 'wms' && 'WMS service endpoint URL'}
                                {layer.type === 'tiled' && 'Tile template URL with {z}/{y}/{x}'}
                                {layer.type === 'vectorTiled' && 'Vector tile template URL with {z}/{y}/{x}'}
                                {layer.type === 'mapImage' && 'ArcGIS REST MapServer endpoint'}
                                {layer.type === 'feature' && 'ArcGIS REST FeatureServer endpoint'}
                              </div>
                            </div>

                            {layer.type === 'portalItem' && (
                              <div>
                                <label className="block text-slate-400 mb-1">Portal Layer ID</label>
                                <input
                                  type="number"
                                  className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded"
                                  value={layer.options?.layerId || 0}
                                  onChange={(e) => updateSublayer(index, {
                                    options: {
                                      ...(layer.options || {}),
                                      layerId: parseInt((e.target as HTMLInputElement).value) || 0
                                    }
                                  })}
                                  placeholder="0"
                                />
                              </div>
                            )}

                            {layer.type === 'wms' && (
                              <div>
                                <label className="block text-slate-400 mb-1">WMS Layer Names <span className="text-red-400">*required</span></label>
                                <div className="space-y-2">
                                  {(layer.options?.layerNames || []).length === 0 && (
                                    <div className="text-xs text-red-400 mb-2">
                                      ⚠️ WMS layers require at least one layer name
                                    </div>
                                  )}
                                  {(layer.options?.layerNames || ['layer1']).map((name: string, i: number) => (
                                    <div key={i} className="flex gap-2">
                                      <input
                                        type="text"
                                        className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded"
                                        value={name}
                                        onChange={(e) => {
                                          const names = [...(layer.options?.layerNames || [])];
                                          names[i] = (e.target as HTMLInputElement).value;
                                          updateSublayer(index, { options: { ...(layer.options || {}), layerNames: names } });
                                        }}
                                        onBlur={(e) => {
                                          // Remove empty layer names on blur
                                          const value = (e.target as HTMLInputElement).value.trim();
                                          if (!value) {
                                            const names = [...(layer.options?.layerNames || [])];
                                            if (names.length > 1) {
                                              // Only remove if there are other names
                                              names.splice(i, 1);
                                              updateSublayer(index, { options: { ...(layer.options || {}), layerNames: names } });
                                            } else {
                                              // Reset to placeholder if it's the only one
                                              (e.target as HTMLInputElement).value = `layer${i + 1}`;
                                              names[i] = `layer${i + 1}`;
                                              updateSublayer(index, { options: { ...(layer.options || {}), layerNames: names } });
                                            }
                                          }
                                        }}
                                        placeholder={`layer${i + 1}`}
                                      />
                                      {(layer.options?.layerNames || []).length > 1 && (
                                        <button
                                          type="button"
                                          className="btn tiny danger"
                                          onClick={() => {
                                            const names = [...(layer.options?.layerNames || [])];
                                            names.splice(i, 1);
                                            updateSublayer(index, { options: { ...(layer.options || {}), layerNames: names } });
                                          }}
                                        >
                                          ×
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    className="btn tiny"
                                    onClick={() => {
                                      const names = [...(layer.options?.layerNames || []), ''];
                                      updateSublayer(index, { options: { ...(layer.options || {}), layerNames: names } });
                                    }}
                                  >
                                    + Add Layer Name
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Custom Options Editor */}
                            <div>
                              <label className="block text-slate-400 mb-1">Custom Options</label>
                              <div className="space-y-2">
                                {Object.entries(layer.options || {}).map(([key, value]) => {
                                  // Skip special handled fields that have dedicated UI
                                  if (key === 'layerNames' || key === 'layerId' || key === 'opacity') return null;
                                  
                                  return (
                                    <div key={key} className="flex gap-2 items-center">
                                      <input
                                        type="text"
                                        className="w-1/3 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded"
                                        value={key}
                                        onChange={(e) => {
                                          const newKey = (e.target as HTMLInputElement).value;
                                          const newOptions = { ...(layer.options || {}) };
                                          if (newKey !== key) {
                                            delete newOptions[key];
                                            if (newKey.trim()) {
                                              newOptions[newKey] = value;
                                            }
                                            updateSublayer(index, { options: newOptions });
                                          }
                                        }}
                                        placeholder="key"
                                      />
                                      <span className="text-slate-500">:</span>
                                      <input
                                        type="text"
                                        className="flex-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded"
                                        value={typeof value === 'string' ? value : JSON.stringify(value)}
                                        onChange={(e) => {
                                          let newValue: any = (e.target as HTMLInputElement).value;
                                          // Try to parse as number or boolean
                                          if (newValue === 'true') newValue = true;
                                          else if (newValue === 'false') newValue = false;
                                          else if (!isNaN(Number(newValue)) && newValue.trim() !== '') {
                                            newValue = Number(newValue);
                                          }
                                          
                                          const newOptions = { ...(layer.options || {}) };
                                          newOptions[key] = newValue;
                                          updateSublayer(index, { options: newOptions });
                                        }}
                                        placeholder="value"
                                      />
                                      <button
                                        type="button"
                                        className="btn tiny danger"
                                        onClick={() => {
                                          const newOptions = { ...(layer.options || {}) };
                                          delete newOptions[key];
                                          updateSublayer(index, { options: newOptions });
                                        }}
                                        title="Remove option"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  );
                                })}
                                <button
                                  type="button"
                                  className="btn tiny"
                                  onClick={() => {
                                    const newOptions = { ...(layer.options || {}) };
                                    newOptions['newOption'] = '';
                                    updateSublayer(index, { options: newOptions });
                                  }}
                                >
                                  + Add Custom Option
                                </button>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1">
                                Add custom properties. Values are auto-parsed (numbers, booleans, or strings).
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Usage info when not editing */}
                  {!isEditing.value && layerUsage.value.length > 0 && (
                    <div className="form-group mt-3">
                      <label className="form-label">Layer Usage</label>
                      <div className="bg-slate-700 rounded p-3 text-sm">
                        <div className="text-slate-300 mb-2">This layer is referenced by {layerUsage.value.length} item(s):</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {layerUsage.value.map((usage, index) => (
                            <div key={index} className="text-slate-400 text-xs flex items-center gap-2">
                              <span className="bg-slate-600 px-2 py-0.5 rounded text-xs">
                                {usage.featureType === 'weatherFeatures' ? 'Weather' : 'Feature'}
                              </span>
                              <span>{usage.featureName}</span>
                              <span className="text-slate-500">→</span>
                              <span>{usage.itemName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {!isEditing.value && layerUsage.value.length === 0 && currentEntry.value && (
                    <div className="form-group mt-3">
                      <label className="form-label">Layer Usage</label>
                      <div className="bg-slate-700 rounded p-3 text-sm text-slate-400">
                        This layer is not currently referenced by any features or items.
                        <br />
                        <span className="text-xs text-slate-500">Consider deleting if no longer needed.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeDetailTab.value === 'json' && (
              <div className="h-full min-h-0">
                <JsonEditor
                  key={`${draftKey.value ?? 'new'}:${isEditing.value ? 'edit' : 'view'}`}
                  title="Selected Layer JSON"
                  value={workingEntry.value}
                  onChange={handleJsonChange}
                  readOnly={!isEditing.value}
                  height="100%"
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
