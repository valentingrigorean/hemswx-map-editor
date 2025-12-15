import { useComputed, useSignal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { jsonData } from '../../lib/jsonStore';
import { LayerEntry, LayerConfig } from '../../lib/types';
import { getDefaultLayerConfig } from '../../lib/layers';
import { validateLayerEntry } from '../../lib/validation';
import { getLayerUsage } from '../../lib/utils';
import ValidationDisplay from '../ValidationDisplay';
import LayerConfigEditor from './ui/LayerConfigEditor';
import ConfigHeader from '../ui/ConfigHeader';
import Tabs from '../ui/Tabs';

export const LAYER_TEMPLATES = [
  { id: 'wms', name: 'WMS', type: 'wms' as const, description: 'Web Map Service' },
  { id: 'arcgis-feature', name: 'Feature', type: 'feature' as const, description: 'Feature Service' },
  { id: 'arcgis-map', name: 'Map Image', type: 'mapImage' as const, description: 'Map Server' },
  { id: 'portal', name: 'Portal Item', type: 'portalItem' as const, description: 'ArcGIS Online' },
  { id: 'tiled', name: 'Tiled', type: 'tiled' as const, description: 'Tile Service' },
  { id: 'vector', name: 'Vector Tiled', type: 'vectorTiled' as const, description: 'Vector Tiles' },
  { id: 'wmts', name: 'WMTS', type: 'wmts' as const, description: 'Web Map Tile' },
  { id: 'scene', name: 'Scene Layer', type: 'sceneLayer' as const, description: '3D Scene' },
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
  const expandedSublayer = useSignal<number | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'sublayers'>('general');

  return (
    <div className="space-y-4">
      <ConfigHeader
        title={layer.id || 'New Layer'}
        id={layer.id}
        // Since LayerEditor is embedded, we might not have save/cancel or view toggles passed down yet
        // But for consistency, the header is present.
      />

      <ValidationDisplay validation={validation.value} className="mb-4" />

      <Tabs
        tabs={[
          { id: 'general', label: 'General' },
          { id: 'sublayers', label: `Sublayers (${layer.layers?.length || 0})` },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
      />

      {activeTab === 'general' && (
        <div className="space-y-4">
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
            <div className="mt-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <label className="form-label mb-2">Usage References</label>
              <div className="text-sm text-slate-400">
                {usage.value.length === 0 ? (
                  <span className="text-orange-400 flex items-center gap-2">
                    <span className="text-lg">⚠️</span> Not referenced by any feature
                  </span>
                ) : (
                  <div className="space-y-2">
                    {usage.value.map((u, i) => (
                      <div key={i} className="flex items-center gap-2 text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span className="font-medium text-slate-200">{u.featureName}</span>
                        <span className="text-slate-500">→</span>
                        <span>{u.itemName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sublayers' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {LAYER_TEMPLATES.slice(0, 3).map(tmpl => (
              <button
                key={tmpl.id}
                className="btn tiny"
                onClick={() => {
                  const newLayers = [...(layer.layers || [])];
                  newLayers.push(getDefaultLayerConfig(tmpl.type));
                  onUpdate({ layers: newLayers });
                  expandedSublayer.value = newLayers.length - 1;
                }}
                title={`Add ${tmpl.name}`}
              >
                + {tmpl.type.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {(layer.layers || []).map((sublayer, subIdx) => (
              <LayerConfigEditor
                key={subIdx}
                index={subIdx}
                sublayer={sublayer}
                isExpanded={expandedSublayer.value === subIdx}
                onToggle={() => expandedSublayer.value = expandedSublayer.value === subIdx ? null : subIdx}
                onUpdate={(changes) => onUpdateSublayer(subIdx, changes)}
                onRemove={() => {
                  const newLayers = [...(layer.layers || [])];
                  newLayers.splice(subIdx, 1);
                  onUpdate({ layers: newLayers });
                  if (expandedSublayer.value === subIdx) {
                    expandedSublayer.value = null;
                  }
                }}
              />
            ))}
          </div>

          {(layer.layers?.length || 0) === 0 && (
            <div className="text-center py-8 border border-dashed border-slate-600 rounded-lg bg-slate-800/30">
              <p className="text-slate-400 text-sm mb-4">No sublayers defined. Choose a template to start:</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                {LAYER_TEMPLATES.map(tmpl => (
                  <button
                    key={tmpl.id}
                    className="btn small bg-slate-700 hover:bg-slate-600 border border-slate-600"
                    onClick={() => {
                      onUpdate({ layers: [getDefaultLayerConfig(tmpl.type)] });
                      expandedSublayer.value = 0;
                    }}
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
