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
  clearLayerDraft
} from '../lib/jsonStore';
import { LayerConfig, LayerType } from '../lib/types';
import { getDefaultLayerConfig, LAYER_TYPES, upsertLayer, validateLayer } from '../lib/layers';
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

  return (
    <div className="max-h-[calc(100vh-180px)] overflow-auto">
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <span className="text-slate-500">
          {isEditing.value ? (currentIndex.value >= 0 ? 'Edit Layer' : 'New Layer') : 'Layer Details'}
        </span>
        <div className="ml-auto flex gap-2">
          {!isEditing.value && canEdit.value && (
            <button className="btn small" onClick={beginEdit}>Edit</button>
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
            </div>

            <div className="form-group">
              <label className="form-label">Source URL/ID</label>
              <input
                type="text"
                className="form-input"
                value={workingLayer.value.source || ''}
                onChange={(e) => updateDraft({ source: (e.target as HTMLInputElement).value })}
                placeholder={workingLayer.value.type === 'portalItem' ? 'portal-item-id' : 'https://example.com/service'}
                disabled={!isEditing.value}
              />
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

