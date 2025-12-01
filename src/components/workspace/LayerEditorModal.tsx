import { useSignal, useComputed } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { LayerConfig } from '../../lib/types';
import { getLayerById, updateLayerById } from '../../lib/jsonStore';
import { LAYER_TYPES, getDefaultLayerConfig } from '../../lib/layers';
import { LAYER_TEMPLATES } from './LayerEditor';

const RESERVED_OPTIONS = ['opacity', 'layerNames', 'layerId'];

interface LayerEditorModalProps {
  layerId: string | null;
  onClose: () => void;
}

export default function LayerEditorModal({ layerId, onClose }: LayerEditorModalProps) {
  const expandedSublayer = useSignal<number | null>(0);

  const layer = useComputed(() => layerId ? getLayerById(layerId) : null);

  useEffect(() => {
    expandedSublayer.value = 0;
  }, [layerId]);

  if (!layerId || !layer.value) return null;

  const currentLayer = layer.value;

  const updateSublayer = (index: number, changes: Partial<LayerConfig>) => {
    const newLayers = [...(currentLayer.layers || [])];
    newLayers[index] = { ...newLayers[index], ...changes };
    updateLayerById(layerId, { layers: newLayers });
  };

  const addSublayer = (type: LayerConfig['type']) => {
    const newLayers = [...(currentLayer.layers || []), getDefaultLayerConfig(type)];
    updateLayerById(layerId, { layers: newLayers });
    expandedSublayer.value = newLayers.length - 1;
  };

  const removeSublayer = (index: number) => {
    const newLayers = currentLayer.layers.filter((_, i) => i !== index);
    updateLayerById(layerId, { layers: newLayers });
    if (expandedSublayer.value === index) {
      expandedSublayer.value = newLayers.length > 0 ? 0 : null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-600 rounded-xl w-[650px] max-w-[95vw] max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">Edit Layer</h3>
            <div className="text-sm text-blue-400">{layerId}</div>
          </div>
          <button
            className="text-slate-400 hover:text-white text-xl leading-none px-2"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Sublayers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="form-label text-sm">Sublayers ({currentLayer.layers?.length || 0})</label>
              <div className="flex gap-1">
                {LAYER_TEMPLATES.slice(0, 3).map(tmpl => (
                  <button
                    key={tmpl.type}
                    type="button"
                    className="text-[10px] px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                    onClick={() => addSublayer(tmpl.type)}
                    title={tmpl.description}
                  >
                    + {tmpl.type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {(currentLayer.layers || []).map((sublayer, idx) => (
              <SublayerEditor
                key={idx}
                index={idx}
                sublayer={sublayer}
                isExpanded={expandedSublayer.value === idx}
                onToggle={() => expandedSublayer.value = expandedSublayer.value === idx ? null : idx}
                onUpdate={(changes) => updateSublayer(idx, changes)}
                onRemove={() => removeSublayer(idx)}
              />
            ))}

            {(currentLayer.layers?.length || 0) === 0 && (
              <div className="text-center py-6 border border-dashed border-slate-600 rounded-lg">
                <p className="text-slate-500 text-sm mb-2">No sublayers defined</p>
                <button
                  className="btn small primary"
                  onClick={() => addSublayer('wms')}
                >
                  Add First Sublayer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex gap-2 justify-end">
          <button className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface SublayerEditorProps {
  index: number;
  sublayer: LayerConfig;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (changes: Partial<LayerConfig>) => void;
  onRemove: () => void;
}

function SublayerEditor({
  index,
  sublayer,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove
}: SublayerEditorProps) {
  const updateOptions = (key: string, value: any) => {
    onUpdate({ options: { ...sublayer.options, [key]: value } });
  };

  return (
    <div className="border border-slate-700 rounded-lg bg-slate-900/50 overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/50 transition-colors"
        onClick={onToggle}
      >
        <span className="font-medium text-sm text-slate-300 flex items-center gap-2">
          <span className="text-slate-500">#{index + 1}</span>
          <span className="uppercase text-blue-400">{sublayer.type}</span>
          {sublayer.source && (
            <span className="text-slate-500 text-xs truncate max-w-[200px]">
              {sublayer.source.length > 40 ? '...' + sublayer.source.slice(-40) : sublayer.source}
            </span>
          )}
        </span>
        <span className="text-slate-500">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="p-3 pt-0 space-y-3 border-t border-slate-700">
          {/* Type */}
          <div className="form-group">
            <label className="form-label text-xs">Type</label>
            <select
              className="form-select"
              value={sublayer.type}
              onChange={(e) => {
                const type = (e.target as HTMLSelectElement).value as LayerConfig['type'];
                const defaults = getDefaultLayerConfig(type);
                onUpdate({
                  type,
                  options: {
                    opacity: sublayer.options?.opacity || 1,
                    ...(type === 'wms' ? { layerNames: defaults.options?.layerNames } : {}),
                    ...(type === 'portalItem' ? { layerId: defaults.options?.layerId } : {})
                  }
                });
              }}
            >
              {LAYER_TYPES.map(t => (
                <option key={t} value={t}>{t.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Source URL */}
          <div className="form-group">
            <label className="form-label text-xs">
              Source URL/ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={sublayer.source || ''}
              onChange={(e) => onUpdate({ source: (e.target as HTMLInputElement).value })}
              placeholder={sublayer.type === 'portalItem' ? 'Portal Item ID' : 'https://...'}
            />
          </div>

          {/* Opacity slider */}
          <div className="form-group">
            <label className="form-label text-xs">Opacity</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round((sublayer.options?.opacity ?? 1) * 100)}
                onChange={(e) => {
                  const v = parseInt((e.target as HTMLInputElement).value) / 100;
                  updateOptions('opacity', Math.round(v * 100) / 100);
                }}
                className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-sm text-slate-400 w-12 text-right">
                {Math.round((sublayer.options?.opacity ?? 1) * 100)}%
              </span>
            </div>
          </div>

          {/* Z-Index and Refresh */}
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label text-xs">Z-Index</label>
              <input
                type="number"
                className="form-input"
                value={sublayer.zIndex || 0}
                onChange={(e) => onUpdate({ zIndex: parseInt((e.target as HTMLInputElement).value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label className="form-label text-xs">Refresh (ms)</label>
              <input
                type="number"
                className="form-input"
                value={sublayer.refreshInterval || ''}
                onChange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  onUpdate({ refreshInterval: val ? parseInt(val) : undefined });
                }}
                placeholder="60000"
              />
            </div>
          </div>

          {/* WMS Layer Names */}
          {sublayer.type === 'wms' && (
            <div className="form-group">
              <label className="form-label text-xs">
                WMS Layer Names <span className="text-red-400">*</span>
              </label>
              <div className="space-y-1">
                {(sublayer.options?.layerNames || []).map((name: string, nameIdx: number) => (
                  <div key={nameIdx} className="flex gap-1">
                    <input
                      type="text"
                      className="form-input text-sm flex-1"
                      value={name}
                      onChange={(e) => {
                        const names = [...(sublayer.options?.layerNames || [])];
                        names[nameIdx] = (e.target as HTMLInputElement).value;
                        updateOptions('layerNames', names);
                      }}
                      placeholder="layer_name"
                    />
                    {(sublayer.options?.layerNames?.length || 0) > 1 && (
                      <button
                        type="button"
                        className="text-red-400 hover:text-red-300 px-2"
                        onClick={() => {
                          const names = [...(sublayer.options?.layerNames || [])];
                          names.splice(nameIdx, 1);
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
                  className="text-xs text-blue-400 hover:text-blue-300"
                  onClick={() => {
                    const names = [...(sublayer.options?.layerNames || []), ''];
                    updateOptions('layerNames', names);
                  }}
                >
                  + Add Layer Name
                </button>
              </div>
            </div>
          )}

          {/* Portal Item Layer ID */}
          {sublayer.type === 'portalItem' && (
            <div className="form-group">
              <label className="form-label text-xs">Portal Layer ID</label>
              <input
                type="number"
                className="form-input"
                value={sublayer.options?.layerId ?? 0}
                onChange={(e) => {
                  updateOptions('layerId', parseInt((e.target as HTMLInputElement).value) || 0);
                }}
              />
            </div>
          )}

          {/* Custom Options */}
          <CustomOptionsEditor
            options={sublayer.options || {}}
            onChange={(newOptions) => onUpdate({ options: newOptions })}
          />

          {/* Remove button */}
          <div className="flex justify-end pt-2 border-t border-slate-700">
            <button
              type="button"
              className="text-xs text-red-400 hover:text-red-300"
              onClick={onRemove}
            >
              Remove Sublayer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomOptionsEditor({
  options,
  onChange
}: {
  options: Record<string, any>;
  onChange: (options: Record<string, any>) => void;
}) {
  const customEntries = Object.entries(options).filter(
    ([key]) => !RESERVED_OPTIONS.includes(key)
  );

  const addOption = () => {
    const newKey = `param_${Date.now()}`;
    onChange({ ...options, [newKey]: '' });
  };

  const updateKey = (oldKey: string, newKey: string) => {
    if (newKey === oldKey || RESERVED_OPTIONS.includes(newKey)) return;
    const newOptions = { ...options };
    const value = newOptions[oldKey];
    delete newOptions[oldKey];
    newOptions[newKey] = value;
    onChange(newOptions);
  };

  const updateValue = (key: string, value: string) => {
    let parsedValue: any = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (!isNaN(Number(value)) && value.trim() !== '') parsedValue = Number(value);
    onChange({ ...options, [key]: parsedValue });
  };

  const removeOption = (key: string) => {
    const newOptions = { ...options };
    delete newOptions[key];
    onChange(newOptions);
  };

  return (
    <div className="form-group">
      <div className="flex items-center justify-between mb-1">
        <label className="form-label text-xs mb-0">Custom Options</label>
        <button
          type="button"
          className="text-xs text-blue-400 hover:text-blue-300"
          onClick={addOption}
        >
          + Add
        </button>
      </div>
      {customEntries.length === 0 ? (
        <div className="text-xs text-slate-600 italic">No custom options</div>
      ) : (
        <div className="space-y-1">
          {customEntries.map(([key, value]) => (
            <div key={key} className="flex gap-1 items-center">
              <input
                type="text"
                className="form-input text-xs flex-1"
                value={key}
                onChange={(e) => updateKey(key, (e.target as HTMLInputElement).value)}
                placeholder="key"
              />
              <input
                type="text"
                className="form-input text-xs flex-1"
                value={String(value)}
                onChange={(e) => updateValue(key, (e.target as HTMLInputElement).value)}
                placeholder="value"
              />
              <button
                type="button"
                className="text-red-400 hover:text-red-300 px-1"
                onClick={() => removeOption(key)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
