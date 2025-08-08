import { useComputed } from '@preact/signals';
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
import SubEditor from './SubEditor';

export default function FeatureDetailsPanel() {
  const sel = selectedFeature;
  const selData = selectedFeatureData;

  const draft = useComputed<MapFeature | null>(() => {
    if (!sel.value.type || sel.value.index < 0) return null;
    return getFeatureDraft(sel.value.type, sel.value.index) || null;
  });

  const isEditing = useComputed(() => draft.value != null);
  const working = useComputed<MapFeature | null>(() => {
    if (draft.value) return draft.value;
    return selData.value || null;
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

    // Minimal validation
    if (!draftVal.presentation || !Array.isArray(draftVal.items)) {
      setStatus('❌ Feature is missing required fields');
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
    <div className="max-h-[calc(100vh-180px)] overflow-auto">
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <span className="text-slate-500">{isEditing.value ? 'Edit Feature' : 'Feature Details'}</span>
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
        <div className="text-center p-5 text-slate-500">Select a feature on the left to view/edit</div>
      ) : (
        <>
          {/* Form */}
          <div className="layer-section">
            <div className="form-group">
              <label className="form-label">Feature ID</label>
              <input
                type="text"
                className="form-input"
                value={working.value.id || ''}
                onChange={(e) => updateDraft({ id: (e.target as HTMLInputElement).value })}
                placeholder="feature_id"
                disabled={!isEditing.value}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Feature Name</label>
              <input
                type="text"
                className="form-input"
                value={working.value.name || ''}
                onChange={(e) => updateDraft({ name: (e.target as HTMLInputElement).value })}
                placeholder="Feature display name"
                disabled={!isEditing.value}
              />
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
            </div>

            <div className="form-group">
              <label className="form-label">Items</label>
              <div className="text-xs text-slate-500">{(working.value.items || []).length} item(s). Edit full details in the JSON below.</div>
            </div>
          </div>

          {/* JSON Preview / Editor */}
          <SubEditor
            title="Selected Feature JSON"
            value={working.value}
            placeholder="Select a feature on the left"
            onChange={handleJsonChange}
          />
        </>
      )}
    </div>
  );
}

