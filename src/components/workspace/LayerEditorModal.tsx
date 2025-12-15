import { useSignal, useComputed } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { LayerConfig } from '../../lib/types';
import { getLayerById, updateLayerById } from '../../lib/jsonStore';
import { getDefaultLayerConfig } from '../../lib/layers';
import { LAYER_TEMPLATES } from './LayerEditor';
import LayerConfigEditor from './ui/LayerConfigEditor';

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
        className="bg-slate-800 border border-slate-600 rounded-xl w-[600px] max-w-[95vw] min-h-[400px] max-h-[85vh] flex flex-col shadow-2xl"
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
              <LayerConfigEditor
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
