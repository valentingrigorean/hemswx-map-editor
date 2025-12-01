import { useComputed } from '@preact/signals';
import { jsonData } from '../../lib/jsonStore';
import { LayerEntry, LayerConfig } from '../../lib/types';
import { LAYER_TYPES, getDefaultLayerConfig } from '../../lib/layers';
import { validateLayerEntry } from '../../lib/validation';
import { getLayerUsage } from '../../lib/utils';
import CollapsibleSection from '../ui/CollapsibleSection';
import ValidationDisplay from '../ValidationDisplay';

const RESERVED_OPTIONS = ['opacity', 'layerNames', 'layerId'];

interface OpacitySliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

function OpacitySlider({ value, onChange, className = '' }: OpacitySliderProps) {
  const displayValue = Math.round(value * 100);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        type="range"
        min="0"
        max="100"
        value={displayValue}
        onChange={(e) => {
          const v = parseInt((e.target as HTMLInputElement).value) / 100;
          onChange(Math.round(v * 100) / 100);
        }}
        className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <span className="text-xs text-slate-400 w-10 text-right">{displayValue}%</span>
    </div>
  );
}

interface CustomOptionsEditorProps {
  options: Record<string, any>;
  onChange: (options: Record<string, any>) => void;
}

function CustomOptionsEditor({ options, onChange }: CustomOptionsEditorProps) {
  const customEntries = Object.entries(options).filter(
    ([key]) => !RESERVED_OPTIONS.includes(key)
  );

  const addOption = () => {
    const newKey = `param_${Date.now()}`;
    onChange({ ...options, [newKey]: '' });
  };

  const updateKey = (oldKey: string, newKey: string) => {
    if (newKey === oldKey) return;
    if (RESERVED_OPTIONS.includes(newKey)) return;
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
    <div className="form-group mt-3">
      <div className="flex items-center justify-between mb-2">
        <label className="form-label text-xs mb-0">Custom Options</label>
        <button
          className="btn tiny"
          onClick={addOption}
        >
          + Add
        </button>
      </div>
      {customEntries.length === 0 ? (
        <div className="text-xs text-slate-500 italic">No custom options</div>
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
                className="btn tiny danger"
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

export const LAYER_TEMPLATES = [
  { id: 'wms', name: 'WMS Layer', type: 'wms' as const, description: 'Web Map Service' },
  { id: 'arcgis-feature', name: 'ArcGIS Feature', type: 'feature' as const, description: 'Feature Service' },
  { id: 'arcgis-map', name: 'ArcGIS Map Image', type: 'mapImage' as const, description: 'Map Server' },
  { id: 'portal', name: 'Portal Item', type: 'portalItem' as const, description: 'ArcGIS Online' },
  { id: 'tiled', name: 'Tiled Layer', type: 'tiled' as const, description: 'Tile Service' },
  { id: 'vector', name: 'Vector Tiles', type: 'vectorTiled' as const, description: 'Vector Tile Service' },
];

interface LayerEditorProps {
  layer: LayerEntry;
  onUpdate: (changes: Partial<LayerEntry>) => void;
  onUpdateSublayer: (index: number, changes: Partial<LayerConfig>) => void;
}

export default function LayerEditor({
  layer,
  onUpdate,
  onUpdateSublayer
}: LayerEditorProps) {
  const validation = useComputed(() => validateLayerEntry(layer));
  const usage = useComputed(() => getLayerUsage(jsonData.value, layer.id));

  return (
    <div className="space-y-4">
      <ValidationDisplay validation={validation.value} className="mb-4" />

      <CollapsibleSection title="Layer Information" defaultOpen={true}>
        <div className="form-group">
          <label className="form-label">Layer ID</label>
          <input
            type="text"
            className="form-input"
            value={layer.id || ''}
            onChange={(e) => onUpdate({ id: (e.target as HTMLInputElement).value })}
            placeholder="unique_layer_id"
          />
        </div>

        {layer.id && (
          <div className="mt-3">
            <label className="form-label">Usage</label>
            <div className="text-sm text-slate-400">
              {usage.value.length === 0 ? (
                <span className="text-orange-400">Not referenced by any feature</span>
              ) : (
                <div className="space-y-1">
                  {usage.value.map((u, i) => (
                    <div key={i}>
                      {u.featureName} → {u.itemName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="form-group">
            <label className="form-label">Category</label>
            <input
              type="text"
              className="form-input"
              value={layer.category || ''}
              onChange={(e) => onUpdate({ category: (e.target as HTMLInputElement).value || undefined })}
              placeholder="e.g. weather"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Copyright</label>
            <input
              type="text"
              className="form-input"
              value={layer.copyright || ''}
              onChange={(e) => onUpdate({ copyright: (e.target as HTMLInputElement).value || undefined })}
              placeholder="e.g. SMHI"
            />
          </div>
        </div>

        <div className="form-group mt-3">
          <label className="form-label">Country Restriction</label>
          <div className="flex flex-wrap gap-1 mb-2">
            {(layer.country || []).map((c, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs">
                {c}
                <button
                  className="text-red-400 hover:text-red-300"
                  onClick={() => {
                    const country = [...(layer.country || [])];
                    country.splice(idx, 1);
                    onUpdate({ country: country.length > 0 ? country : undefined });
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            {(!layer.country || layer.country.length === 0) && (
              <span className="text-slate-500 text-xs">No restriction (all countries)</span>
            )}
          </div>
          <div className="flex gap-1">
            {['no', 'se', 'dk'].map(code => (
              <button
                key={code}
                className={`btn tiny ${(layer.country || []).includes(code) ? 'primary' : ''}`}
                onClick={() => {
                  const current = layer.country || [];
                  if (current.includes(code)) {
                    const country = current.filter(c => c !== code);
                    onUpdate({ country: country.length > 0 ? country : undefined });
                  } else {
                    onUpdate({ country: [...current, code] });
                  }
                }}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Sublayers"
        badge={layer.layers?.length || 0}
        actions={
          <div className="flex gap-1">
            {LAYER_TEMPLATES.slice(0, 3).map(tmpl => (
              <button
                key={tmpl.id}
                className="btn tiny"
                onClick={() => {
                  const newLayers = [...(layer.layers || [])];
                  newLayers.push(getDefaultLayerConfig(tmpl.type));
                  onUpdate({ layers: newLayers });
                }}
                title={`Add ${tmpl.name}`}
              >
                + {tmpl.type.toUpperCase()}
              </button>
            ))}
          </div>
        }
      >
        {(layer.layers || []).map((sublayer, subIdx) => (
          <div key={subIdx} className="border border-slate-600 rounded-lg p-3 mb-3 bg-slate-800/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-300">
                #{subIdx + 1} {sublayer.type.toUpperCase()}
              </span>
              <button
                className="btn tiny danger"
                onClick={() => {
                  const newLayers = [...(layer.layers || [])];
                  newLayers.splice(subIdx, 1);
                  onUpdate({ layers: newLayers });
                }}
              >
                Remove
              </button>
            </div>

            <div className="form-group">
              <label className="form-label text-xs">Type</label>
              <select
                className="form-select text-sm"
                value={sublayer.type}
                onChange={(e) => {
                  const type = (e.target as HTMLSelectElement).value as LayerConfig['type'];
                  const defaults = getDefaultLayerConfig(type);
                  onUpdateSublayer(subIdx, {
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

            <div className="form-group mt-3">
              <label className="form-label text-xs">Opacity</label>
              <OpacitySlider
                value={sublayer.options?.opacity ?? 1}
                onChange={(opacity) => {
                  onUpdateSublayer(subIdx, { options: { ...sublayer.options, opacity } });
                }}
              />
            </div>

            <div className="form-group mt-3">
              <label className="form-label text-xs">Source URL/ID</label>
              <input
                type="text"
                className="form-input text-sm"
                value={sublayer.source || ''}
                onChange={(e) => onUpdateSublayer(subIdx, { source: (e.target as HTMLInputElement).value })}
                placeholder={
                  sublayer.type === 'portalItem' ? 'Portal Item ID' :
                  sublayer.type === 'wms' ? 'https://example.com/wms' :
                  'https://example.com/service'
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="form-group">
                <label className="form-label text-xs">Z-Index</label>
                <input
                  type="number"
                  className="form-input text-sm"
                  value={sublayer.zIndex || 0}
                  onChange={(e) => onUpdateSublayer(subIdx, { zIndex: parseInt((e.target as HTMLInputElement).value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label className="form-label text-xs">Refresh (ms)</label>
                <input
                  type="number"
                  className="form-input text-sm"
                  value={sublayer.refreshInterval || ''}
                  onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    onUpdateSublayer(subIdx, { refreshInterval: val ? parseInt(val) : undefined });
                  }}
                  placeholder="60000"
                />
              </div>
            </div>

            {/* WMS Layer Names */}
            {sublayer.type === 'wms' && (
              <div className="form-group mt-3">
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
                          onUpdateSublayer(subIdx, { options: { ...sublayer.options, layerNames: names } });
                        }}
                      />
                      {(sublayer.options?.layerNames?.length || 0) > 1 && (
                        <button
                          className="btn tiny danger"
                          onClick={() => {
                            const names = [...(sublayer.options?.layerNames || [])];
                            names.splice(nameIdx, 1);
                            onUpdateSublayer(subIdx, { options: { ...sublayer.options, layerNames: names } });
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    className="btn tiny"
                    onClick={() => {
                      const names = [...(sublayer.options?.layerNames || []), ''];
                      onUpdateSublayer(subIdx, { options: { ...sublayer.options, layerNames: names } });
                    }}
                  >
                    + Add Layer Name
                  </button>
                </div>
              </div>
            )}

            {/* Portal Item Layer ID */}
            {sublayer.type === 'portalItem' && (
              <div className="form-group mt-3">
                <label className="form-label text-xs">Portal Layer ID</label>
                <input
                  type="number"
                  className="form-input text-sm"
                  value={sublayer.options?.layerId ?? 0}
                  onChange={(e) => {
                    onUpdateSublayer(subIdx, {
                      options: {
                        ...sublayer.options,
                        layerId: parseInt((e.target as HTMLInputElement).value) || 0
                      }
                    });
                  }}
                />
              </div>
            )}

            {/* Custom Options */}
            <CustomOptionsEditor
              options={sublayer.options || {}}
              onChange={(newOptions) => onUpdateSublayer(subIdx, { options: newOptions })}
            />
          </div>
        ))}

        {(layer.layers?.length || 0) === 0 && (
          <div className="text-center py-4 border border-dashed border-slate-600 rounded">
            <p className="text-slate-500 text-sm mb-3">No sublayers. Choose a template:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {LAYER_TEMPLATES.map(tmpl => (
                <button
                  key={tmpl.id}
                  className="btn small"
                  onClick={() => {
                    onUpdate({ layers: [getDefaultLayerConfig(tmpl.type)] });
                  }}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
