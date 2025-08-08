import { useComputed } from '@preact/signals';
import { 
  jsonData, 
  selectedLayer, 
  selectLayer, 
  deleteLayer
} from '../lib/jsonStore';
import { LayerConfig } from '../lib/types';
import { collectReferencedLayerIds } from '../lib/utils';

interface LayerItemProps {
  layer: LayerConfig;
  index: number;
  isUsed: boolean;
}

function LayerItem({ layer, index, isUsed }: LayerItemProps) {
  const isSelected = useComputed(() => selectedLayer.value.index === index);

  const handleClick = () => {
    selectLayer(index);
  };

  const handleDelete = (e: Event) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete layer "${layer.id}"?`)) {
      deleteLayer(index);
    }
  };

  return (
    <div 
      className={`feature-list-item ${isSelected.value ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <div className="feature-info">
        <div className="feature-name">{layer.id || '(no id)'}</div>
        <div className="feature-details">
          <span className={`pill ${isUsed ? 'ok' : 'warn'}`}>
            {isUsed ? 'used' : 'unused'}
          </span>
          <span className="ml-2 text-xs">
            {layer.type}
          </span>
        </div>
      </div>
      <div className="feature-actions">
        <button 
          className="btn danger small" 
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
}


export default function LayerBuilder() {
  const layers = useComputed(() => jsonData.value.layers || []);
  const usedLayerIds = useComputed(() => collectReferencedLayerIds(jsonData.value));

  return (
    <div>
      <div className="feature-category">
        <div className="feature-category-header">Layers</div>
        <div className="feature-category-content">
          {layers.value.length === 0 ? (
            <div className="p-3 text-slate-500 text-center">
              No layers found
            </div>
          ) : (
            layers.value.map((layer, index) => (
              <LayerItem
                key={layer.id || index}
                layer={layer}
                index={index}
                isUsed={usedLayerIds.value.has(layer.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
