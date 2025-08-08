import { useComputed } from '@preact/signals';
import { wizardState, updateWizardData, jsonData } from '../../lib/jsonStore';

export default function StepLayers() {
  const wizard = wizardState.value;
  const data = wizard.data;
  const availableLayers = useComputed(() => jsonData.value.layers || []);

  const handleLayerAssignment = (itemIndex: number, layerId: string, assigned: boolean) => {
    const updatedItems = data.items.map((item, i) => {
      if (i === itemIndex) {
        const currentLayerIds = item.layersIds || [];
        const newLayerIds = assigned 
          ? [...currentLayerIds, layerId]
          : currentLayerIds.filter(id => id !== layerId);
        return { ...item, layersIds: newLayerIds };
      }
      return item;
    });
    
    updateWizardData({ items: updatedItems });
  };

  const isLayerAssigned = (itemIndex: number, layerId: string) => {
    const item = data.items[itemIndex];
    return item?.layersIds?.includes(layerId) || false;
  };

  if (data.items.length === 0) {
    return (
      <div>
        <h3>Associate Layers with Items</h3>
        <p className="muted">No items to associate. Go back to add items first.</p>
      </div>
    );
  }

  if (availableLayers.value.length === 0) {
    return (
      <div>
        <h3>Associate Layers with Items</h3>
        <p className="muted">
          No layers found in the JSON data. You can create layers in the Layers tab after creating this feature.
        </p>
        <div className="validation-results">
          <div className="validation-item warning">
            ⚠️ Items without layer associations will not function properly in the application.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3>Associate Layers with Items</h3>
      <p className="muted">
        Select which layers each item should control. Items without layer associations will not function.
      </p>
      
      <div className="layer-grid">
        {data.items.map((item, itemIndex) => (
          <div key={itemIndex} className="layer-section">
            <h4>{item.name}</h4>
            <div className="layer-options">
              {availableLayers.value.map((layer, layerIndex) => (
                <div key={layerIndex} className="layer-option">
                  <input
                    type="checkbox"
                    id={`layer-${itemIndex}-${layerIndex}`}
                    checked={isLayerAssigned(itemIndex, layer.id)}
                    onChange={(e) => handleLayerAssignment(
                      itemIndex, 
                      layer.id, 
                      (e.target as HTMLInputElement).checked
                    )}
                  />
                  <label htmlFor={`layer-${itemIndex}-${layerIndex}`}>
                    {layer.id}
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>
                      {layer.type.toUpperCase()}
                    </div>
                  </label>
                </div>
              ))}
            </div>
            
            {item.layersIds.length === 0 && (
              <div style={{ 
                marginTop: '8px', 
                fontSize: '11px', 
                color: 'var(--warn)',
                fontStyle: 'italic' 
              }}>
                ⚠️ No layers assigned to this item
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary of unassigned items */}
      {data.items.some(item => item.layersIds.length === 0) && (
        <div className="validation-results" style={{ marginTop: '16px' }}>
          <div className="validation-item warning">
            ⚠️ Some items don't have layer associations. These items will not function properly.
          </div>
        </div>
      )}

      {/* Bulk assignment helpers */}
      <div style={{ marginTop: '16px', padding: '12px', background: 'var(--input-bg)', borderRadius: '8px' }}>
        <div className="form-label" style={{ marginBottom: '8px' }}>Quick Actions:</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className="btn small"
            onClick={() => {
              // Assign all layers to all items
              const updatedItems = data.items.map(item => ({
                ...item,
                layersIds: availableLayers.value.map(layer => layer.id)
              }));
              updateWizardData({ items: updatedItems });
            }}
          >
            Assign All Layers to All Items
          </button>
          <button 
            className="btn small"
            onClick={() => {
              // Clear all assignments
              const updatedItems = data.items.map(item => ({
                ...item,
                layersIds: []
              }));
              updateWizardData({ items: updatedItems });
            }}
          >
            Clear All Assignments
          </button>
        </div>
      </div>
    </div>
  );
}