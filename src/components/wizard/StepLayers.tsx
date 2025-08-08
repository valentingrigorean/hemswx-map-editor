import { useComputed, useSignal } from '@preact/signals';
import { wizardState, updateWizardData, jsonData } from '../../lib/jsonStore';
import { isCustomLogicLayer } from '../../lib/settings';

export default function StepLayers() {
  const wizard = wizardState.value;
  const data = wizard.data;
  const searchTerm = useSignal('');
  const availableLayers = useComputed(() => jsonData.value.layers || []);
  
  const filteredLayers = useComputed(() => {
    const term = searchTerm.value.toLowerCase();
    if (!term) return availableLayers.value;
    
    return availableLayers.value.filter(layer => {
      const idMatch = layer.id.toLowerCase().includes(term);
      const sourceMatch = layer.layers?.some(sublayer => 
        sublayer.source?.toLowerCase().includes(term) ||
        sublayer.type?.toLowerCase().includes(term)
      );
      return idMatch || sourceMatch;
    });
  });

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

  const getLayerTypeInfo = (layer: any) => {
    const types = [...new Set(layer.layers?.map((l: any) => l.type.toUpperCase()) || [])];
    const sources = [...new Set(layer.layers?.map((l: any) => {
      if (!l.source) return null;
      try {
        const url = new URL(l.source);
        return url.hostname;
      } catch {
        return l.source.length > 30 ? l.source.substring(0, 30) + '...' : l.source;
      }
    }).filter(Boolean) || [])];
    
    return {
      types: types.join(', '),
      sources: sources.slice(0, 2).join(', ') + (sources.length > 2 ? ` (+${sources.length - 2} more)` : ''),
      layerCount: layer.layers?.length || 0
    };
  };

  return (
    <div>
      <h3>Associate Layers with Items</h3>
      <p className="muted">
        Select which layers each item should control. Items without layer associations will not function.
      </p>

      {/* Search functionality */}
      <div style={{ marginBottom: '16px' }}>
        <div className="form-group">
          <label className="form-label">Search Layers</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search by layer ID, source, or type..."
            value={searchTerm.value}
            onInput={(e) => searchTerm.value = (e.target as HTMLInputElement).value}
          />
        </div>
        {searchTerm.value && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Showing {filteredLayers.value.length} of {availableLayers.value.length} layers
          </div>
        )}
      </div>
      
      {filteredLayers.value.length === 0 && searchTerm.value ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
          No layers found matching "{searchTerm.value}"
        </div>
      ) : (
        <div className="layer-grid">
          {data.items.map((item, itemIndex) => (
            <div key={itemIndex} className="layer-section">
              <h4>{item.name}</h4>
              <div className="layer-options">
                {filteredLayers.value.map((layer, layerIndex) => {
                  const info = getLayerTypeInfo(layer);
                  return (
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
                        <div className="layer-info">
                          <div className="layer-id" style={{ fontWeight: '500', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {layer.id}
                            {isCustomLogicLayer(layer.id) && (
                              <span style={{ 
                                fontSize: '9px', 
                                backgroundColor: '#2563eb', 
                                color: 'white', 
                                padding: '1px 4px', 
                                borderRadius: '2px' 
                              }}>
                                referenced
                              </span>
                            )}
                          </div>
                          <div className="layer-details" style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>
                            <div>{info.types} • {info.layerCount} sublayer{info.layerCount !== 1 ? 's' : ''}</div>
                            {info.sources && (
                              <div title={info.sources} style={{ 
                                maxWidth: '200px', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {info.sources}
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>
                  );
                })}
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
      )}

      {/* Summary of unassigned items */}
      {data.items.some(item => item.layersIds.length === 0) && (
        <div className="validation-results" style={{ marginTop: '16px' }}>
          <div className="validation-item warning">
            ⚠️ Some items don't have layer associations. These items will not function properly.
          </div>
        </div>
      )}

      {/* Debug info (only show if some items have layersIds) */}
      {data.items.some(item => item.layersIds.length > 0) && (
        <div style={{ 
          marginTop: '16px', 
          padding: '8px', 
          background: 'rgba(0,255,0,0.05)', 
          borderRadius: '4px',
          fontSize: '11px',
          color: 'var(--text-muted)'
        }}>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: '500' }}>
              Layer Assignments Preview
            </summary>
            <div style={{ marginTop: '8px', fontFamily: 'monospace' }}>
              {data.items.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '4px' }}>
                  <strong>{item.name}:</strong> [{item.layersIds.join(', ')}]
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Bulk assignment helpers */}
      <div style={{ marginTop: '16px', padding: '12px', background: 'var(--input-bg)', borderRadius: '8px' }}>
        <div className="form-label" style={{ marginBottom: '8px' }}>Quick Actions:</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className="btn small"
            onClick={() => {
              // Assign all visible layers to all items
              const layersToAssign = searchTerm.value 
                ? filteredLayers.value.map(layer => layer.id)
                : availableLayers.value.map(layer => layer.id);
              const updatedItems = data.items.map(item => ({
                ...item,
                layersIds: [...new Set([...item.layersIds, ...layersToAssign])]
              }));
              updateWizardData({ items: updatedItems });
            }}
          >
            {searchTerm.value ? 'Assign Filtered Layers to All Items' : 'Assign All Layers to All Items'}
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