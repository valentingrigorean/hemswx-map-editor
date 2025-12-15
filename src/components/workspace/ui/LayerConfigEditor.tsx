import { LayerConfig, MapDimension } from '../../../lib/types';
import { LAYER_TYPES, getDefaultLayerConfig } from '../../../lib/layers';

const RESERVED_OPTIONS = ['opacity', 'layerNames', 'layerId'];

export interface LayerConfigFormProps {
  config: LayerConfig;
  onChange: (changes: Partial<LayerConfig>) => void;
}

export function LayerConfigForm({ config, onChange }: LayerConfigFormProps) {
  const updateOptions = (key: string, value: any) => {
    onChange({ options: { ...config.options, [key]: value } });
  };

  const isPortalSource = config.type === 'portalItem' || config.sourceKind === 'portalItem';

  return (
    <div className="space-y-3">
      {/* Type */}
      <div className="form-group">
        <label className="form-label text-xs">Type</label>
        <div className="flex flex-wrap gap-2">
          {LAYER_TYPES.map(t => (
            <button
              key={t}
              type="button"
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                config.type === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              onClick={() => {
                const defaults = getDefaultLayerConfig(t);
                onChange({
                  type: t,
                  options: {
                    opacity: config.options?.opacity || 1,
                    ...(t === 'wms' ? { layerNames: defaults.options?.layerNames } : {}),
                    ...(t === 'portalItem' ? { layerId: defaults.options?.layerId } : {})
                  }
                });
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

       {/* Source Kind (optional, mainly for disambiguation) */}
       {config.type !== 'portalItem' && (
        <div className="form-group">
          <label className="form-label text-xs">Source Kind</label>
          <div className="flex gap-2">
            <button
              type="button"
              className={`px-3 py-1.5 rounded text-xs transition-colors ${
                config.sourceKind !== 'portalItem'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              onClick={() => onChange({ sourceKind: 'uri' })}
            >
              URI (URL)
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded text-xs transition-colors ${
                config.sourceKind === 'portalItem'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              onClick={() => onChange({ sourceKind: 'portalItem' })}
            >
              Portal Item
            </button>
          </div>
        </div>
      )}

      {/* Source URL */}
      <div className="form-group">
        <label className="form-label text-xs">
          {isPortalSource ? 'Portal Item ID' : 'Source URL'} <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          className="form-input"
          value={config.source || ''}
          onChange={(e) => onChange({ source: (e.target as HTMLInputElement).value })}
          placeholder={isPortalSource ? 'e.g. 2e258ef465334b509134c6aec567a410' : 'https://...'}
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
            value={Math.round((config.options?.opacity ?? 1) * 100)}
            onChange={(e) => {
              const v = parseInt((e.target as HTMLInputElement).value) / 100;
              updateOptions('opacity', Math.round(v * 100) / 100);
            }}
            className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-sm text-slate-400 w-12 text-right">
            {Math.round((config.options?.opacity ?? 1) * 100)}%
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
            value={config.zIndex || 0}
            onChange={(e) => onChange({ zIndex: parseInt((e.target as HTMLInputElement).value) || 0 })}
          />
        </div>
        <div className="form-group">
          <label className="form-label text-xs">Refresh (ms)</label>
          <input
            type="number"
            className="form-input"
            value={config.refreshInterval || ''}
            onChange={(e) => {
              const val = (e.target as HTMLInputElement).value;
              onChange({ refreshInterval: val ? parseInt(val) : undefined });
            }}
            placeholder="60000"
          />
        </div>
      </div>

      {/* Supported Dimensions */}
      <div className="form-group">
        <label className="form-label text-xs">Supported Dimensions</label>
        <div className="flex gap-3">
          {(['map', 'scene'] as MapDimension[]).map(dim => (
            <label key={dim} className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={!config.supportedDimensions || config.supportedDimensions.includes(dim)}
                onChange={(e) => {
                  const checked = (e.target as HTMLInputElement).checked;
                  let dims = config.supportedDimensions ? [...config.supportedDimensions] : ['map', 'scene'];
                  if (checked && !dims.includes(dim)) {
                    dims.push(dim);
                  } else if (!checked) {
                    dims = dims.filter(d => d !== dim);
                  }
                  onChange({ supportedDimensions: dims.length === 2 ? undefined : dims as MapDimension[] });
                }}
              />
              {dim === 'map' ? '2D Map' : '3D Scene'}
            </label>
          ))}
        </div>
      </div>

      {/* WMS Layer Names */}
      {config.type === 'wms' && (
        <div className="form-group">
          <label className="form-label text-xs">
            WMS Layer Names <span className="text-red-400">*</span>
          </label>
          <div className="space-y-1">
            {(config.options?.layerNames || []).map((name: string, nameIdx: number) => (
              <div key={nameIdx} className="flex gap-1">
                <input
                  type="text"
                  className="form-input text-sm flex-1"
                  value={name}
                  onChange={(e) => {
                    const names = [...(config.options?.layerNames || [])];
                    names[nameIdx] = (e.target as HTMLInputElement).value;
                    updateOptions('layerNames', names);
                  }}
                  placeholder="layer_name"
                />
                {(config.options?.layerNames?.length || 0) > 1 && (
                  <button
                    type="button"
                    className="text-red-400 hover:text-red-300 px-2"
                    onClick={() => {
                      const names = [...(config.options?.layerNames || [])];
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
                const names = [...(config.options?.layerNames || []), ''];
                updateOptions('layerNames', names);
              }}
            >
              + Add Layer Name
            </button>
          </div>
        </div>
      )}

      {/* Portal Item Layer ID */}
      {config.type === 'portalItem' && (
        <div className="form-group">
          <label className="form-label text-xs">Portal Layer ID</label>
          <input
            type="number"
            className="form-input"
            value={config.options?.layerId ?? 0}
            onChange={(e) => {
              updateOptions('layerId', parseInt((e.target as HTMLInputElement).value) || 0);
            }}
          />
        </div>
      )}

      {/* Custom Options */}
      <CustomOptionsEditor
        options={config.options || {}}
        onChange={(newOptions) => onChange({ options: newOptions })}
      />
    </div>
  );
}

export interface LayerConfigEditorProps {
  index?: number;
  sublayer: LayerConfig;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (changes: Partial<LayerConfig>) => void;
  onRemove: () => void;
}

export default function LayerConfigEditor({
  index,
  sublayer,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove
}: LayerConfigEditorProps) {
  return (
    <div className="border border-slate-700 rounded-lg bg-slate-900/50 overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/50 transition-colors"
        onClick={onToggle}
      >
        <span className="font-medium text-sm text-slate-300 flex items-center gap-2">
          {index !== undefined && <span className="text-slate-500">#{index + 1}</span>}
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
        <div className="p-3 pt-0 border-t border-slate-700">
          <LayerConfigForm
            config={sublayer}
            onChange={onUpdate}
          />
          {/* Remove button */}
          <div className="flex justify-end pt-2 border-t border-slate-700 mt-3">
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
