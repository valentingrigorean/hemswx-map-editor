import { useSignal, useComputed } from '@preact/signals';
import { useState } from 'preact/hooks';
import { 
  jsonData, 
  selectedLayer, 
  selectLayer, 
  deleteLayer, 
  updateJsonData,
  setStatus 
} from '../lib/jsonStore';
import { 
  LayerConfig, 
  LayerType, 
  LAYER_TYPES, 
  getDefaultLayerConfig, 
  validateLayer,
  upsertLayer 
} from '../lib/layers';
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
          <span style={{ marginLeft: '8px', fontSize: '11px' }}>
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

function LayerEditor() {
  const currentLayer = useComputed(() => {
    const selection = selectedLayer.value;
    if (selection.index >= 0) {
      return jsonData.value.layers[selection.index];
    }
    return null;
  });

  const [editingLayer, setEditingLayer] = useState<LayerConfig | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const validationErrors = useSignal<string[]>([]);

  const layerToEdit = editingLayer || currentLayer.value;
  const isEditing = editingLayer !== null;

  const handleNewLayer = () => {
    const newLayer = getDefaultLayerConfig('wms', '');
    setEditingLayer(newLayer);
    setIsCreatingNew(true);
    validationErrors.value = [];
  };

  const handleEdit = () => {
    if (currentLayer.value) {
      setEditingLayer({ ...currentLayer.value });
      setIsCreatingNew(false);
      validationErrors.value = [];
    }
  };

  const handleSave = () => {
    if (!editingLayer) return;

    const validation = validateLayer(editingLayer);
    if (!validation.valid) {
      validationErrors.value = validation.errors;
      setStatus(`❌ Layer validation failed: ${validation.errors[0]}`);
      return;
    }

    const updatedData = upsertLayer(jsonData.value, editingLayer);
    updateJsonData(updatedData);
    
    // Select the layer we just saved
    const layerIndex = updatedData.layers.findIndex(l => l.id === editingLayer.id);
    if (layerIndex >= 0) {
      selectLayer(layerIndex);
    }

    setEditingLayer(null);
    setIsCreatingNew(false);
    validationErrors.value = [];
    setStatus('✅ Layer saved successfully');
  };

  const handleCancel = () => {
    setEditingLayer(null);
    setIsCreatingNew(false);
    validationErrors.value = [];
  };

  const updateEditingLayer = (updates: Partial<LayerConfig>) => {
    if (editingLayer) {
      setEditingLayer({ ...editingLayer, ...updates });
    }
  };

  if (!layerToEdit) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
        <p>Select a layer to edit or create a new one</p>
        <button className="btn primary" onClick={handleNewLayer}>
          New Layer
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <span className="muted">
          {isCreatingNew ? 'New Layer' : isEditing ? 'Edit Layer' : 'Layer Details'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {!isEditing && currentLayer.value && (
            <button className="btn small" onClick={handleEdit}>
              Edit
            </button>
          )}
          {!isEditing && (
            <button className="btn primary small" onClick={handleNewLayer}>
              New Layer
            </button>
          )}
          {isEditing && (
            <>
              <button className="btn success small" onClick={handleSave}>
                Save
              </button>
              <button className="btn ghost small" onClick={handleCancel}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {validationErrors.value.length > 0 && (
        <div style={{ 
          marginBottom: '12px', 
          padding: '8px', 
          background: 'var(--bad)', 
          color: 'white', 
          borderRadius: '6px',
          fontSize: '12px'
        }}>
          <strong>Validation Errors:</strong>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            {validationErrors.value.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="layer-section">
        <div className="form-group">
          <label className="form-label">Layer ID</label>
          <input
            type="text"
            className="form-input"
            value={layerToEdit.id}
            onChange={(e) => updateEditingLayer({ id: (e.target as HTMLInputElement).value })}
            placeholder="unique_layer_id"
            disabled={!isEditing}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Layer Type</label>
          <select
            className="form-select"
            value={layerToEdit.type}
            onChange={(e) => {
              const type = (e.target as HTMLSelectElement).value as LayerType;
              const defaultConfig = getDefaultLayerConfig(type, layerToEdit.id);
              updateEditingLayer({ 
                type, 
                source: defaultConfig.source,
                layerNames: defaultConfig.layerNames,
                options: defaultConfig.options 
              });
            }}
            disabled={!isEditing}
          >
            {LAYER_TYPES.map(type => (
              <option key={type} value={type}>
                {type.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Source URL/ID</label>
          <input
            type="text"
            className="form-input"
            value={layerToEdit.source || ''}
            onChange={(e) => updateEditingLayer({ source: (e.target as HTMLInputElement).value })}
            placeholder={
              layerToEdit.type === 'portalItem' 
                ? 'portal-item-id' 
                : 'https://example.com/service'
            }
            disabled={!isEditing}
          />
        </div>

        {layerToEdit.type === 'wms' && (
          <div className="form-group">
            <label className="form-label">WMS Layer Names (CSV)</label>
            <input
              type="text"
              className="form-input"
              value={layerToEdit.layerNames || ''}
              onChange={(e) => updateEditingLayer({ layerNames: (e.target as HTMLInputElement).value })}
              placeholder="layer1,layer2,layer3"
              disabled={!isEditing}
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Opacity</label>
          <input
            type="number"
            className="form-input"
            min="0"
            max="1"
            step="0.1"
            value={layerToEdit.opacity || 1}
            onChange={(e) => updateEditingLayer({ opacity: parseFloat((e.target as HTMLInputElement).value) })}
            disabled={!isEditing}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Z-Index</label>
          <input
            type="number"
            className="form-input"
            value={layerToEdit.zIndex || 0}
            onChange={(e) => updateEditingLayer({ zIndex: parseInt((e.target as HTMLInputElement).value) })}
            disabled={!isEditing}
          />
        </div>

        {layerToEdit.type === 'portalItem' && (
          <div className="form-group">
            <label className="form-label">Portal Layer ID</label>
            <input
              type="text"
              className="form-input"
              value={layerToEdit.options?.layerId || ''}
              onChange={(e) => updateEditingLayer({ 
                options: { 
                  ...layerToEdit.options, 
                  layerId: (e.target as HTMLInputElement).value 
                }
              })}
              placeholder="0"
              disabled={!isEditing}
            />
          </div>
        )}
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
            <div style={{ padding: '12px', color: 'var(--muted)', textAlign: 'center' }}>
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

      <LayerEditor />
    </div>
  );
}