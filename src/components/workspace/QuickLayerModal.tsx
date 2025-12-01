import { useSignal } from '@preact/signals';
import { LayerConfig, LayerEntry } from '../../lib/types';
import { getDefaultLayerConfig } from '../../lib/layers';
import { LAYER_TEMPLATES } from './LayerEditor';

interface QuickLayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateLayer: (layer: LayerEntry) => void;
}

export default function QuickLayerModal({
  isOpen,
  onClose,
  onCreateLayer
}: QuickLayerModalProps) {
  const layerId = useSignal('');
  const sublayer = useSignal<LayerConfig>(getDefaultLayerConfig('wms'));

  if (!isOpen) return null;

  const resetForm = () => {
    layerId.value = '';
    sublayer.value = getDefaultLayerConfig('wms');
  };

  const handleCreate = () => {
    const id = layerId.value.trim();
    if (!id) return;

    onCreateLayer({
      id,
      layers: [sublayer.value]
    });
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const updateSublayer = (changes: Partial<LayerConfig>) => {
    sublayer.value = { ...sublayer.value, ...changes };
  };

  const updateOptions = (key: string, value: any) => {
    sublayer.value = {
      ...sublayer.value,
      options: { ...sublayer.value.options, [key]: value }
    };
  };

  const current = sublayer.value;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={handleClose}>
      <div
        className="bg-slate-800 border border-slate-600 rounded-xl w-[550px] max-w-[95vw] max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Create New Layer</h3>
          <button
            className="text-slate-400 hover:text-white text-xl leading-none"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Layer ID */}
          <div className="form-group">
            <label className="form-label">
              Layer ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={layerId.value}
              onInput={(e) => layerId.value = (e.target as HTMLInputElement).value}
              placeholder="unique_layer_id"
              autoFocus
            />
          </div>

          {/* Layer Type */}
          <div className="form-group">
            <label className="form-label">Layer Type</label>
            <div className="grid grid-cols-3 gap-2">
              {LAYER_TEMPLATES.map(tmpl => (
                <button
                  key={tmpl.id}
                  type="button"
                  className={`px-2 py-2 rounded text-sm text-left ${
                    current.type === tmpl.type
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  onClick={() => {
                    const defaults = getDefaultLayerConfig(tmpl.type);
                    sublayer.value = {
                      ...defaults,
                      source: current.source,
                      zIndex: current.zIndex,
                      refreshInterval: current.refreshInterval,
                      options: {
                        ...defaults.options,
                        opacity: current.options?.opacity ?? 1
                      }
                    };
                  }}
                >
                  <div className="font-medium text-xs">{tmpl.name}</div>
                  <div className="text-[10px] opacity-70">{tmpl.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Source URL */}
          <div className="form-group">
            <label className="form-label">
              Source URL/ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={current.source || ''}
              onInput={(e) => updateSublayer({ source: (e.target as HTMLInputElement).value })}
              placeholder={
                current.type === 'portalItem' ? 'Portal Item ID (e.g. abc123)' :
                current.type === 'wms' ? 'https://example.com/wms' :
                'https://example.com/arcgis/rest/services/...'
              }
            />
          </div>

          {/* WMS Layer Names */}
          {current.type === 'wms' && (
            <div className="form-group">
              <label className="form-label">
                WMS Layer Names <span className="text-red-400">*</span>
              </label>
              <div className="space-y-1">
                {(current.options?.layerNames || []).map((name: string, idx: number) => (
                  <div key={idx} className="flex gap-1">
                    <input
                      type="text"
                      className="form-input text-sm flex-1"
                      value={name}
                      onInput={(e) => {
                        const names = [...(current.options?.layerNames || [])];
                        names[idx] = (e.target as HTMLInputElement).value;
                        updateOptions('layerNames', names);
                      }}
                      placeholder="layer_name"
                    />
                    {(current.options?.layerNames?.length || 0) > 1 && (
                      <button
                        type="button"
                        className="btn tiny danger"
                        onClick={() => {
                          const names = [...(current.options?.layerNames || [])];
                          names.splice(idx, 1);
                          updateOptions('layerNames', names);
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
                    const names = [...(current.options?.layerNames || []), ''];
                    updateOptions('layerNames', names);
                  }}
                >
                  + Add Layer Name
                </button>
              </div>
            </div>
          )}

          {/* Portal Item Layer ID */}
          {current.type === 'portalItem' && (
            <div className="form-group">
              <label className="form-label">Portal Layer ID</label>
              <input
                type="number"
                className="form-input"
                value={current.options?.layerId ?? 0}
                onInput={(e) => updateOptions('layerId', parseInt((e.target as HTMLInputElement).value) || 0)}
              />
            </div>
          )}

          {/* Row: Opacity, Z-Index, Refresh */}
          <div className="grid grid-cols-3 gap-3">
            <div className="form-group">
              <label className="form-label text-xs">Opacity</label>
              <input
                type="number"
                className="form-input text-sm"
                min="0"
                max="1"
                step="0.1"
                value={current.options?.opacity ?? 1}
                onInput={(e) => {
                  const val = parseFloat((e.target as HTMLInputElement).value);
                  updateOptions('opacity', Math.max(0, Math.min(1, isNaN(val) ? 1 : val)));
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label text-xs">Z-Index</label>
              <input
                type="number"
                className="form-input text-sm"
                value={current.zIndex || 0}
                onInput={(e) => updateSublayer({ zIndex: parseInt((e.target as HTMLInputElement).value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label className="form-label text-xs">Refresh (ms)</label>
              <input
                type="number"
                className="form-input text-sm"
                value={current.refreshInterval || ''}
                onInput={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  updateSublayer({ refreshInterval: val ? parseInt(val) : undefined });
                }}
                placeholder="60000"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex gap-2 justify-end">
          <button className="btn ghost" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={handleCreate}
            disabled={!layerId.value.trim() || !current.source?.trim()}
          >
            Create & Assign
          </button>
        </div>
      </div>
    </div>
  );
}
