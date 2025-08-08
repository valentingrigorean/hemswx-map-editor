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
  deleteLayer
} from '../lib/jsonStore';
import { LayerConfig, LayerType } from '../lib/types';
import { getDefaultLayerConfig, LAYER_TYPES, upsertLayer, validateLayer } from '../lib/layers';
import { getLayerUsage } from '../lib/utils';
import SubEditor from './SubEditor';

export default function LayerDetailsPanel() {
  const currentIndex = useComputed(() => selectedLayer.value.index);
  const currentLayerValue = selectedLayerData;

  const draftKey = useMemo<number | 'new' | null>(() => {
    if (currentIndex.value >= 0) return currentIndex.value;
    return null;
  }, [currentIndex.value]);

  const draftLayer = useComputed<LayerConfig | null>(() => {
    if (draftKey === null) return null;
    return getLayerDraft(draftKey) || null;
  });

  const isEditing = useComputed(() => draftLayer.value != null || draftKey === 'new');
  const workingLayer = useComputed<LayerConfig | null>(() => {
    if (draftLayer.value) return draftLayer.value;
    return currentLayerValue.value || null;
  });

  const validationErrors = useSignal<string[]>([]);

  const startNew = () => {
    const fresh = getDefaultLayerConfig('wms', '');
    setLayerDraft('new', fresh);
    selectLayer(-1);
    validationErrors.value = [];
  };

  const beginEdit = () => {
    if (currentIndex.value < 0 || !currentLayerValue.value) return;
    setLayerDraft(currentIndex.value, { ...(currentLayerValue.value as LayerConfig) });
    validationErrors.value = [];
  };

  const applySave = () => {
    const key = draftKey ?? 'new';
    const draft = (key === 'new' ? layerDrafts.value['new'] : layerDrafts.value[key]) as LayerConfig | undefined;
    if (!draft) return;

    const validation = validateLayer(draft);
    if (!validation.valid) {
      validationErrors.value = validation.errors;
      setStatus(`❌ Layer validation failed: ${validation.errors[0]}`);
      return;
    }

    const updatedData = upsertLayer(jsonData.value, draft);
    updateJsonData(updatedData);

    // determine new index by id
    const newIndex = updatedData.layers.findIndex((l) => l.id === draft.id);
    if (newIndex >= 0) selectLayer(newIndex);

    clearLayerDraft('new');
    if (typeof key === 'number') clearLayerDraft(key);
    validationErrors.value = [];
    setStatus('✅ Layer saved successfully');
  };

  const cancelEdit = () => {
    clearLayerDraft('new');
    if (typeof draftKey === 'number') clearLayerDraft(draftKey);
    validationErrors.value = [];
  };

  const handleDelete = () => {
    if (currentIndex.value < 0 || !currentLayerValue.value) return;
    
    const layerName = currentLayerValue.value.id || `Layer ${currentIndex.value + 1}`;
    if (confirm(`Are you sure you want to delete layer "${layerName}"? This action cannot be undone.`)) {
      deleteLayer(currentIndex.value);
    }
  };

  const handleDuplicate = () => {
    if (currentIndex.value < 0 || !currentLayerValue.value) return;
    
    const originalLayer = currentLayerValue.value;
    const duplicatedLayer = {
      ...originalLayer,
      id: `${originalLayer.id}_copy`
    };
    
    setLayerDraft('new', duplicatedLayer);
    selectLayer(-1);
    validationErrors.value = [];
  };

  const updateDraft = (updates: Partial<LayerConfig>) => {
    const key = draftKey ?? 'new';
    const base: LayerConfig = (key === 'new' ? layerDrafts.value['new'] : layerDrafts.value[key]) as LayerConfig;
    const next = { ...base, ...updates } as LayerConfig;
    setLayerDraft(key, next);
  };

  const handleJsonChange = (next: LayerConfig) => {
    // Ensure we are in editing mode; create draft if needed
    if (currentLayerValue.value && draftKey === currentIndex.value && !draftLayer.value) {
      setLayerDraft(currentIndex.value, { ...(currentLayerValue.value as LayerConfig) });
    }
    const key = draftKey ?? 'new';
    setLayerDraft(key, next);
  };

  const canEdit = useComputed(() => currentIndex.value >= 0 && !!currentLayerValue.value);
  
  const layerUsage = useComputed(() => {
    if (!currentLayerValue.value?.id) return [];
    return getLayerUsage(jsonData.value, currentLayerValue.value.id);
  });

  return (
    <div className="max-h-[calc(100vh-180px)] overflow-auto">
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <span className="text-slate-500">
          {isEditing.value ? (currentIndex.value >= 0 ? 'Edit Layer' : 'New Layer') : 'Layer Details'}
        </span>
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

      {validationErrors.value.length > 0 && (
        <div className="mb-3 p-2 bg-red-500 text-white rounded text-xs">
          <strong>Validation Errors:</strong>
          <ul className="mt-1 ml-4 p-0">
            {validationErrors.value.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {!workingLayer.value ? (
        <div className="text-center p-5 text-slate-500">
          <p>Select a layer to view/edit or create a new one</p>
          <button className="btn primary" onClick={startNew}>New Layer</button>
        </div>
      ) : (
        <>
          {/* Form */}
          <div className="layer-section">
            <div className="form-group">
              <label className="form-label">Layer ID</label>
              <input
                type="text"
                className="form-input"
                value={workingLayer.value.id}
                onChange={(e) => updateDraft({ id: (e.target as HTMLInputElement).value })}
                placeholder="unique_layer_id"
                disabled={!isEditing.value}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Layer Type</label>
              <select
                className="form-select"
                value={workingLayer.value.type}
                onChange={(e) => {
                  const type = (e.target as HTMLSelectElement).value as LayerType;
                  const defaults = getDefaultLayerConfig(type as any, workingLayer.value?.id || '');
                  updateDraft({ type, source: defaults.source, layerNames: defaults.layerNames, options: defaults.options });
                }}
                disabled={!isEditing.value}
              >
                {LAYER_TYPES.map((t) => (
                  <option key={t} value={t}>{t.toUpperCase()}</option>
                ))}
              </select>
              <div className="text-xs text-slate-400 mt-1">
                {workingLayer.value.type === 'wms' && 'Web Map Service - requires layer names'}
                {workingLayer.value.type === 'tiled' && 'Pre-rendered tile service - fastest loading'}
                {workingLayer.value.type === 'mapImage' && 'Dynamic ArcGIS Map Service'}
                {workingLayer.value.type === 'portalItem' && 'ArcGIS Online Portal Item - requires portal item ID'}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Source URL/ID</label>
              <input
                type="text"
                className="form-input"
                value={workingLayer.value.source || ''}
                onChange={(e) => updateDraft({ source: (e.target as HTMLInputElement).value })}
                placeholder={
                  workingLayer.value.type === 'portalItem' ? 'e.g. abc123def456' :
                  workingLayer.value.type === 'wms' ? 'https://example.com/wms' :
                  workingLayer.value.type === 'tiled' ? 'https://example.com/tiles/{z}/{y}/{x}.png' :
                  'https://example.com/arcgis/rest/services/MapServer'
                }
                disabled={!isEditing.value}
              />
              <div className="text-xs text-slate-400 mt-1">
                {workingLayer.value.type === 'portalItem' && 'Enter the ArcGIS Online portal item ID'}
                {workingLayer.value.type === 'wms' && 'WMS service endpoint URL'}
                {workingLayer.value.type === 'tiled' && 'Tile template URL with {z}/{y}/{x} placeholders'}
                {workingLayer.value.type === 'mapImage' && 'ArcGIS REST MapServer endpoint'}
              </div>
            </div>

            {workingLayer.value.type === 'wms' && (
              <div className="form-group">
                <label className="form-label">WMS Layer Names (CSV)</label>
                <input
                  type="text"
                  className="form-input"
                  value={workingLayer.value.layerNames || ''}
                  onChange={(e) => updateDraft({ layerNames: (e.target as HTMLInputElement).value })}
                  placeholder="layer1,layer2,layer3"
                  disabled={!isEditing.value}
                />
                <div className="text-xs text-slate-400 mt-1">
                  Comma-separated list of WMS layer names to include in requests
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Opacity</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="1"
                step="0.1"
                value={workingLayer.value.opacity ?? 1}
                onChange={(e) => updateDraft({ opacity: parseFloat((e.target as HTMLInputElement).value) })}
                disabled={!isEditing.value}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Z-Index</label>
              <input
                type="number"
                className="form-input"
                value={workingLayer.value.zIndex ?? 0}
                onChange={(e) => updateDraft({ zIndex: parseInt((e.target as HTMLInputElement).value) })}
                disabled={!isEditing.value}
              />
            </div>

            {workingLayer.value.type === 'portalItem' && (
              <div className="form-group">
                <label className="form-label">Portal Layer ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={workingLayer.value.options?.layerId || ''}
                  onChange={(e) => updateDraft({ options: { ...(workingLayer.value.options || {}), layerId: (e.target as HTMLInputElement).value } })}
                  placeholder="0"
                  disabled={!isEditing.value}
                />
              </div>
            )}

            {!isEditing.value && layerUsage.value.length > 0 && (
              <div className="form-group">
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

            {!isEditing.value && layerUsage.value.length === 0 && currentLayerValue.value && (
              <div className="form-group">
                <label className="form-label">Layer Usage</label>
                <div className="bg-slate-700 rounded p-3 text-sm text-slate-400">
                  This layer is not currently referenced by any features or items.
                  <br />
                  <span className="text-xs text-slate-500">Consider deleting if no longer needed.</span>
                </div>
              </div>
            )}
          </div>

          {/* JSON Preview / Editor */}
          <SubEditor
            title="Selected Layer JSON"
            value={workingLayer.value}
            placeholder="Select a layer on the left"
            onChange={handleJsonChange}
          />
        </>
      )}
    </div>
  );
}

