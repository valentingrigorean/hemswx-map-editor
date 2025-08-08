import { useComputed } from '@preact/signals';
import { 
  jsonData, 
  selectedLayer, 
  selectLayer, 
  deleteLayerByIndex
} from '../lib/jsonStore';
import { LayerEntry } from '../lib/types';
import { collectReferencedLayerIds } from '../lib/utils';
import { isCustomLogicLayer } from '../lib/settings';

interface LayerItemProps {
  layer: LayerEntry;
  index: number;
  isUsed: boolean;
}

function LayerItem({ layer, index, isUsed }: LayerItemProps) {
  const isSelected = useComputed(() => selectedLayer.value.index === index);
  const hasCustomLogic = isCustomLogicLayer(layer.id);

  const handleClick = () => {
    selectLayer(index);
  };

  const handleDelete = (e: Event) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete layer "${layer.id}"?`)) {
      deleteLayerByIndex(index);
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
          {hasCustomLogic && (
            <span className="ml-2 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">
              referenced
            </span>
          )}
          <span className="ml-2 text-xs">
            {layer.layers?.length || 0} sublayer{(layer.layers?.length || 0) === 1 ? '' : 's'}
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
    <div className="flex flex-col h-full">
      <div className="feature-browser flex-1 overflow-auto">
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
    </div>
  );
}
