import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { MapLayerEntity } from '../../lib/types';
import { LayerConfigForm } from './ui/LayerConfigEditor';

function getDefaultMapLayer(): MapLayerEntity {
  return {
    type: 'vectorTiled',
    source: '',
    sourceKind: 'uri',
  };
}

interface MapLayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (layer: MapLayerEntity) => void;
  initialLayer?: MapLayerEntity;
  title?: string;
  saveLabel?: string;
}

export default function MapLayerModal({
  isOpen,
  onClose,
  onSave,
  initialLayer,
  title = 'Add Layer',
  saveLabel = 'Add'
}: MapLayerModalProps) {
  const layer = useSignal<MapLayerEntity>(initialLayer || getDefaultMapLayer());

  // Reset layer when modal opens or initialLayer changes
  useEffect(() => {
    if (isOpen) {
      layer.value = initialLayer ? { ...initialLayer } : getDefaultMapLayer();
    }
  }, [isOpen, initialLayer]);

  if (!isOpen) return null;

  const resetForm = () => {
    layer.value = initialLayer ? { ...initialLayer } : getDefaultMapLayer();
  };

  const handleSave = () => {
    if (!layer.value.source?.trim()) return;
    onSave(layer.value);
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const current = layer.value;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={handleClose}>
      <div
        className="bg-slate-800 border border-slate-600 rounded-xl w-[600px] max-w-[95vw] min-h-[400px] max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">{title}</h3>
          <button
            className="text-slate-400 hover:text-white text-xl leading-none"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <LayerConfigForm
            config={current}
            onChange={(changes) => {
              layer.value = { ...layer.value, ...changes };
            }}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex gap-2 justify-end">
          <button className="btn ghost" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={!current.source?.trim()}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
