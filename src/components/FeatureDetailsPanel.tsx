import { useComputed, useSignal } from '@preact/signals';
import {
  jsonData,
  selectedFeature,
  selectedFeatureData,
  setStatus,
  updateJsonData,
  getFeatureDraft,
  setFeatureDraft,
  clearFeatureDraft
} from '../lib/jsonStore';
import { MapFeature } from '../lib/types';
import JsonEditor from './JsonEditor';

interface LayerMultiSelectProps {
  selectedLayerIds: string[];
  onChange: (layerIds: string[]) => void;
}

interface LayerSelectionModalProps {
  isOpen: boolean;
  selectedLayerIds: string[];
  onClose: () => void;
  onSave: (layerIds: string[]) => void;
}

function LayerSelectionModal({ isOpen, selectedLayerIds, onClose, onSave }: LayerSelectionModalProps) {
  const tempSelection = useSignal<string[]>(selectedLayerIds);
  
  // Update temp selection when props change
  const prevSelectedIds = useSignal<string[]>([]);
  if (JSON.stringify(prevSelectedIds.value) !== JSON.stringify(selectedLayerIds)) {
    tempSelection.value = [...selectedLayerIds];
    prevSelectedIds.value = [...selectedLayerIds];
  }
  const availableLayers = useComputed(() => jsonData.value.layers || []);
  const otherAssignedLayerIds = useComputed(() => {
    const assigned = new Set<string>();
    // Get all layer IDs from all features and items, excluding current selection
    [...(jsonData.value.weatherFeatures || []), ...(jsonData.value.features || [])].forEach(feature => {
      (feature.items || []).forEach(item => {
        (item.layersIds || []).forEach(id => {
          // Don't count currently selected layers as "assigned"
          if (!selectedLayerIds.includes(id)) {
            assigned.add(id);
          }
        });
      });
    });
    return assigned;
  });

  const sortedLayers = useComputed(() => {
    const layers = availableLayers.value.map(layer => ({
      id: layer.id,
      title: layer.title || layer.id || 'Unnamed Layer',
      isAssigned: otherAssignedLayerIds.value.has(layer.id)
    }));
    
    // Sort: unassigned first, then assigned, alphabetically within each group
    return layers.sort((a, b) => {
      if (a.isAssigned !== b.isAssigned) {
        return a.isAssigned ? 1 : -1; // unassigned first
      }
      return a.title.localeCompare(b.title);
    });
  });

  const toggleLayer = (layerId: string) => {
    const current = tempSelection.value || [];
    tempSelection.value = current.includes(layerId)
      ? current.filter(id => id !== layerId)
      : [...current, layerId];
  };

  const handleSave = () => {
    onSave(tempSelection.value);
    onClose();
  };

  const handleCancel = () => {
    tempSelection.value = selectedLayerIds;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCancel}>
      <div className="bg-slate-800 border border-slate-600 rounded-lg w-96 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-medium text-white">Select Layers</h3>
          <p className="text-sm text-slate-400 mt-1">
            Choose one or more layers for this item ({tempSelection.value.length} selected)
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 max-h-96">
          {sortedLayers.value.length === 0 ? (
            <div className="p-4 text-center text-slate-500">No layers available</div>
          ) : (
            <div className="space-y-1">
              {sortedLayers.value.map(layer => (
                <label key={layer.id} className="flex items-center gap-3 p-2 hover:bg-slate-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={tempSelection.value.includes(layer.id)}
                    onChange={() => toggleLayer(layer.id)}
                  />
                  <div className="flex-1">
                    <div className={`text-sm ${!layer.isAssigned ? 'text-green-300 font-medium' : 'text-slate-200'}`}>
                      {layer.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      ID: {layer.id}
                      {!layer.isAssigned && <span className="ml-2 text-green-400">• Available</span>}
                      {layer.isAssigned && <span className="ml-2 text-orange-400">• In use</span>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-700 flex gap-2 justify-end">
          <button className="btn ghost small" onClick={handleCancel}>
            Cancel
          </button>
          <button className="btn success small" onClick={handleSave}>
            Save Selection ({tempSelection.value.length})
          </button>
        </div>
      </div>
    </div>
  );
}

function LayerMultiSelect({ selectedLayerIds, onChange }: LayerMultiSelectProps) {
  const isModalOpen = useSignal(false);
  const selectedCount = selectedLayerIds.length;
  
  const getSelectedLayerNames = useComputed(() => {
    if (selectedCount === 0) return 'No layers selected';
    
    const layers = jsonData.value.layers || [];
    const selectedNames = selectedLayerIds
      .map(id => {
        const layer = layers.find(l => l.id === id);
        return layer?.title || layer?.id || id;
      })
      .slice(0, 2); // Show max 2 names
    
    if (selectedCount <= 2) {
      return selectedNames.join(', ');
    } else {
      return `${selectedNames.join(', ')} +${selectedCount - 2} more`;
    }
  });

  return (
    <>
      <button
        type="button"
        className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-left hover:border-slate-500 focus:border-blue-500 transition-colors"
        onClick={() => isModalOpen.value = true}
      >
        <div className="flex items-center justify-between">
          <span className={selectedCount > 0 ? 'text-slate-200' : 'text-slate-500'}>
            {getSelectedLayerNames.value}
          </span>
          <span className="text-slate-400 text-xs">
            {selectedCount > 0 && (
              <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded-full mr-1">
                {selectedCount}
              </span>
            )}
            Click to select...
          </span>
        </div>
      </button>
      
      <LayerSelectionModal
        isOpen={isModalOpen.value}
        selectedLayerIds={selectedLayerIds}
        onClose={() => isModalOpen.value = false}
        onSave={onChange}
      />
    </>
  );
}

const DETAIL_TABS = [
  { id: 'details', label: 'Details' },
  { id: 'json', label: 'JSON' }
] as const;

// Helper function similar to Dart's UIFeatureEntityExtension
const getFeatureIdentifier = (feature: MapFeature | null): string => {
  if (!feature) return '';
  
  const value = feature.id || feature.name;
  if (value?.trim()) {
    return value;
  }
  
  const firstItem = (feature.items || [])[0];
  return firstItem?.id || '';
};

const getFeatureDisplayName = (feature: MapFeature | null): string => {
  if (!feature) return '';
  
  const name = feature.name;
  if (name?.trim()) {
    return name;
  }
  
  // For single presentation, use first item name as fallback
  if (feature.presentation === 'single') {
    const firstItem = (feature.items || [])[0];
    if (firstItem?.name?.trim()) {
      return firstItem.name;
    }
  }
  
  return feature.id || '';
};

export default function FeatureDetailsPanel() {
  const sel = selectedFeature;
  const selData = selectedFeatureData;
  const activeDetailTab = useSignal<'details' | 'json'>('details');

  const draft = useComputed<MapFeature | null>(() => {
    if (!sel.value.type || sel.value.index < 0) return null;
    return getFeatureDraft(sel.value.type, sel.value.index) || null;
  });

  const isEditing = useComputed(() => draft.value != null);
  const working = useComputed<MapFeature | null>(() => {
    if (draft.value) return draft.value;
    return selData.value || null;
  });

  const displayName = useComputed(() => {
    return getFeatureDisplayName(working.value) || 'Unnamed Feature';
  });

  const identifier = useComputed(() => {
    return getFeatureIdentifier(working.value) || 'No ID';
  });

  const isSingleWithOneItem = useComputed(() => {
    return working.value?.presentation === 'single' && 
           (working.value.items || []).length === 1;
  });

  const shouldInheritFromItem = useComputed(() => {
    const feature = working.value;
    if (!feature || feature.presentation !== 'single') return false;
    
    const items = feature.items || [];
    if (items.length !== 1) return false;
    
    // Suggest inheritance if feature fields are empty and item has data
    const firstItem = items[0];
    const featureHasId = feature.id?.trim();
    const featureHasName = feature.name?.trim();
    const itemHasId = firstItem?.id?.trim();
    const itemHasName = firstItem?.name?.trim();
    
    return (!featureHasId && itemHasId) || (!featureHasName && itemHasName);
  });

  const beginEdit = () => {
    if (!sel.value.type || sel.value.index < 0 || !selData.value) return;
    setFeatureDraft(sel.value.type, sel.value.index, { ...(selData.value as MapFeature) });
  };

  const cancelEdit = () => {
    if (!sel.value.type || sel.value.index < 0) return;
    clearFeatureDraft(sel.value.type, sel.value.index);
  };

  const applySave = () => {
    if (!sel.value.type || sel.value.index < 0) return;
    const draftVal = draft.value;
    if (!draftVal) return;

    // Validation
    if (!draftVal.presentation || !Array.isArray(draftVal.items)) {
      setStatus('❌ Feature is missing required fields');
      return;
    }

    if (draftVal.items.length === 0) {
      setStatus('❌ Feature must have at least one item');
      return;
    }

    // Validate that each item has required fields
    const invalidItems = draftVal.items.filter((item, index) => 
      !item.id?.trim() || !item.name?.trim()
    );
    
    if (invalidItems.length > 0) {
      setStatus('❌ All items must have both ID and Name');
      return;
    }

    const updated = { ...jsonData.value } as any;
    const arr = [...updated[sel.value.type]];
    arr[sel.value.index] = draftVal;
    updated[sel.value.type] = arr;
    updateJsonData(updated);
    clearFeatureDraft(sel.value.type, sel.value.index);
    setStatus('✅ Feature saved successfully');
  };

  const updateDraft = (changes: Partial<MapFeature>) => {
    if (!sel.value.type || sel.value.index < 0) return;
    const base = draft.value || (selData.value as MapFeature);
    setFeatureDraft(sel.value.type, sel.value.index, { ...base, ...changes });
  };

  const handleJsonChange = (next: MapFeature) => {
    if (!sel.value.type || sel.value.index < 0) return;
    setFeatureDraft(sel.value.type, sel.value.index, next);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Edit controls */}
      <div className="flex flex-wrap gap-2 mb-3 items-center flex-shrink-0">
        <div>
          <span className="text-slate-500">
            {isEditing.value ? 'Edit Feature' : 'Feature Details'}
          </span>
          {working.value && (
            <div className="text-xs text-slate-400 mt-0.5">
              {displayName.value} {identifier.value !== displayName.value && `(${identifier.value})`}
            </div>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          {!isEditing.value && sel.value.type && sel.value.index >= 0 && (
            <button className="btn small" onClick={beginEdit}>Edit</button>
          )}
          {isEditing.value && (
            <>
              <button className="btn success small" onClick={applySave}>Save</button>
              <button className="btn ghost small" onClick={cancelEdit}>Cancel</button>
            </>
          )}
        </div>
      </div>

      {!working.value ? (
        <div className="text-center p-5 text-slate-500 flex-1 flex items-center justify-center">
          Select a feature on the left to view/edit
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
                {/* Inheritance Suggestion */}
                {shouldInheritFromItem.value && isEditing.value && (
                  <div className="bg-blue-900/30 border border-blue-500/50 rounded p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <div className="text-blue-400 text-sm">💡</div>
                      <div className="flex-1">
                        <div className="text-blue-300 text-sm font-medium mb-1">
                          Single Item Feature Detected
                        </div>
                        <div className="text-blue-200 text-xs mb-2">
                          For single-item features, you can leave Feature ID and Name empty to inherit from the item.
                        </div>
                        <button
                          className="btn tiny"
                          onClick={() => {
                            updateDraft({ id: '', name: '' });
                          }}
                        >
                          Clear Feature Fields
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="layer-section">
                  <div className="form-group">
                    <label className="form-label">Feature ID</label>
                    <input
                      type="text"
                      className="form-input"
                      value={working.value.id || ''}
                      onChange={(e) => updateDraft({ id: (e.target as HTMLInputElement).value })}
                      placeholder={working.value.presentation === 'single' ? 'Leave empty to use first item ID' : 'e.g. icing_index, radar, wind_60min'}
                      disabled={!isEditing.value}
                    />
                    <div className="text-xs text-slate-500 mt-1">
                      {working.value.presentation === 'single' 
                        ? 'Optional - will inherit from first item if empty'
                        : 'Optional unique identifier for this feature group'
                      }
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Feature Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={working.value.name || ''}
                      onChange={(e) => updateDraft({ name: (e.target as HTMLInputElement).value })}
                      placeholder={working.value.presentation === 'single' ? 'Leave empty to use first item name' : 'e.g. Weather Layers, Navigation Features'}
                      disabled={!isEditing.value}
                    />
                    <div className="text-xs text-slate-500 mt-1">
                      {working.value.presentation === 'single'
                        ? 'Optional - will inherit from first item if empty'
                        : 'Optional display name for this feature group'
                      }
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Presentation</label>
                    <select
                      className="form-select"
                      value={working.value.presentation}
                      onChange={(e) => updateDraft({ presentation: (e.target as HTMLSelectElement).value as any })}
                      disabled={!isEditing.value}
                    >
                      <option value="single">Single</option>
                      <option value="multiple">Multiple</option>
                    </select>
                    <div className="text-xs text-slate-500 mt-1">
                      {working.value.presentation === 'single' ? (
                        <>
                          <span className="font-medium text-blue-300">Single:</span> Only one item can be selected. 
                          {isSingleWithOneItem.value && (
                            <span className="text-blue-300"> Feature can inherit from item.</span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="font-medium text-green-300">Multiple:</span> Multiple items can be selected. Feature should have its own name.
                        </>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mutually Exclusive</label>
                    <div>
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={!!working.value.mutuallyExclusive}
                        onChange={(e) => updateDraft({ mutuallyExclusive: (e.target as HTMLInputElement).checked })}
                        disabled={!isEditing.value}
                      />
                      <span className="text-slate-200 text-sm">Only one item selectable at a time</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      When enabled, selecting one item automatically deselects others
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Items
                      {(working.value.items || []).length === 0 && (
                        <span className="text-orange-400 text-xs ml-1">(at least one required)</span>
                      )}
                    </label>
                    
                    {(working.value.items || []).length === 0 ? (
                      <div className="text-center p-4 border border-dashed border-slate-600 rounded bg-slate-900">
                        <div className="text-slate-400 text-sm mb-2">No items defined</div>
                        {isEditing.value && (
                          <button
                            className="btn small primary"
                            onClick={() => {
                              const newItem = {
                                id: '',
                                name: '',
                                layersIds: []
                              };
                              updateDraft({ items: [newItem] });
                            }}
                          >
                            Add First Item
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(working.value.items || []).map((item, index) => (
                          <div key={index} className="border border-slate-600 rounded p-3 bg-slate-900">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-slate-400 font-mono">#{index + 1}</span>
                              <div className="flex-1">
                                <div className="text-sm font-medium">
                                  {item.name || item.id || `Item ${index + 1}`}
                                </div>
                                <div className="text-xs text-slate-500">
                                  ID: {item.id || '(empty)'} • 
                                  Layers: {(item.layersIds || []).length} • 
                                  Legend: {item.showLegend ? 'Yes' : 'No'}
                                </div>
                              </div>
                              {isEditing.value && (
                                <div className="flex gap-1">
                                  {working.value.presentation !== 'single' && (
                                    <button
                                      className="btn tiny"
                                      onClick={() => {
                                        const newItems = [...(working.value.items || [])];
                                        const newItem = {
                                          id: '',
                                          name: '',
                                          layersIds: []
                                        };
                                        newItems.splice(index + 1, 0, newItem);
                                        updateDraft({ items: newItems });
                                      }}
                                    >
                                      +
                                    </button>
                                  )}
                                  {(working.value.items || []).length > 1 && (
                                    <button
                                      className="btn tiny danger"
                                      onClick={() => {
                                        if (confirm('Remove this item?')) {
                                          const newItems = [...(working.value.items || [])];
                                          newItems.splice(index, 1);
                                          updateDraft({ items: newItems });
                                        }
                                      }}
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {isEditing.value && (
                              <div className="space-y-2 text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-slate-400 mb-1">Item ID</label>
                                    <input
                                      type="text"
                                      className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded"
                                      value={item.id || ''}
                                      onChange={(e) => {
                                        const newItems = [...(working.value.items || [])];
                                        newItems[index] = { ...item, id: (e.target as HTMLInputElement).value };
                                        updateDraft({ items: newItems });
                                      }}
                                      placeholder="e.g. icing_index"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-slate-400 mb-1">Item Name</label>
                                    <input
                                      type="text"
                                      className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded"
                                      value={item.name || ''}
                                      onChange={(e) => {
                                        const newItems = [...(working.value.items || [])];
                                        newItems[index] = { ...item, name: (e.target as HTMLInputElement).value };
                                        updateDraft({ items: newItems });
                                      }}
                                      placeholder="e.g. Icing Index (60 min)"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-slate-400 mb-1">Layer IDs</label>
                                  <LayerMultiSelect 
                                    selectedLayerIds={item.layersIds || []}
                                    onChange={(layersIds) => {
                                      const newItems = [...(working.value.items || [])];
                                      newItems[index] = { ...item, layersIds };
                                      updateDraft({ items: newItems });
                                    }}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    className="form-checkbox"
                                    checked={item.showLegend || false}
                                    onChange={(e) => {
                                      const newItems = [...(working.value.items || [])];
                                      newItems[index] = { ...item, showLegend: (e.target as HTMLInputElement).checked };
                                      updateDraft({ items: newItems });
                                    }}
                                  />
                                  <span className="text-slate-400">Show Legend</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {isEditing.value && working.value.presentation !== 'single' && (
                          <button
                            className="btn small w-full"
                            onClick={() => {
                              const newItem = {
                                id: '',
                                name: '',
                                layersIds: []
                              };
                              updateDraft({ items: [...(working.value.items || []), newItem] });
                            }}
                          >
                            + Add Another Item
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeDetailTab.value === 'json' && (
              <div className="h-full min-h-0">
                <JsonEditor
                  title="Selected Feature JSON"
                  value={working.value}
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

