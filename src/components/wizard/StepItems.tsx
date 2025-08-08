import { useSignal } from '@preact/signals';
import { wizardState, updateWizardData } from '../../lib/jsonStore';
import { WizardItemData } from '../../lib/types';
import { slug } from '../../lib/utils';

export default function StepItems() {
  const wizard = wizardState.value;
  const data = wizard.data;
  
  const itemName = useSignal('');
  const showLegend = useSignal(true);
  const legendUrl = useSignal('');
  const legendDescription = useSignal('');

  // Check if we should limit to single item
  const isSinglePresentation = data.presentation === 'single';
  const canAddMoreItems = !isSinglePresentation || data.items.length === 0;

  const handleAddItem = () => {
    if (!itemName.value.trim()) return;

    const newItem: WizardItemData = {
      id: slug(itemName.value),
      name: itemName.value.trim(),
      showLegend: showLegend.value,
      legendUrl: legendUrl.value.trim() || undefined,
      legendDescription: legendDescription.value.trim() || undefined,
      layersIds: []
    };

    const updatedItems = [...data.items, newItem];
    updateWizardData({ items: updatedItems });

    // Clear form
    itemName.value = '';
    showLegend.value = true;
    legendUrl.value = '';
    legendDescription.value = '';
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = data.items.filter((_, i) => i !== index);
    updateWizardData({ items: updatedItems });
  };

  const handleEditItem = (index: number, updates: Partial<WizardItemData>) => {
    const updatedItems = data.items.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    );
    updateWizardData({ items: updatedItems });
  };

  return (
    <div>
      <h3>Add Items to Feature</h3>
      
      {isSinglePresentation && data.items.length > 0 && (
        <div className="alert info" style={{ marginBottom: '16px' }}>
          <strong>Single Presentation Mode:</strong> This feature can only have one item since it's configured as "Single" presentation.
        </div>
      )}
      
      {canAddMoreItems && (
        <>
          <div className="form-group">
            <label className="form-label">Item Name</label>
            <input 
              type="text" 
              className="form-input"
              value={itemName.value}
              onChange={(e) => itemName.value = (e.target as HTMLInputElement).value}
              placeholder="e.g., 'FL025', 'Low Clouds', 'Icing Index'"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <input 
                type="checkbox" 
                className="form-checkbox"
                checked={showLegend.value}
                onChange={(e) => showLegend.value = (e.target as HTMLInputElement).checked}
              />
              Show Legend Button
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">Legend URL (optional)</label>
            <input 
              type="text" 
              className="form-input"
              value={legendUrl.value}
              onChange={(e) => legendUrl.value = (e.target as HTMLInputElement).value}
              placeholder="https://hemswx.no/img/info-map/legend.png"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Legend Description Key (optional)</label>
            <input 
              type="text" 
              className="form-input"
              value={legendDescription.value}
              onChange={(e) => legendDescription.value = (e.target as HTMLInputElement).value}
              placeholder="e.g., 'cloud_low_legend'"
            />
          </div>
          
          <div className="form-group">
            <button 
              className="btn primary" 
              onClick={handleAddItem}
              disabled={!itemName.value.trim()}
            >
              Add Item
            </button>
          </div>
        </>
      )}
      
      <div className="items-container">
        {data.items.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
            No items added yet
          </div>
        ) : (
          data.items.map((item, index) => (
            <div key={index} className="item-row">
              <div className="item-info">
                <div className="item-name">{item.name}</div>
                <div className="item-details">
                  ID: {item.id} 
                  {item.showLegend && ' • Legend enabled'}
                  {item.legendUrl && ' • Has legend URL'}
                  {item.legendDescription && ` • Description: ${item.legendDescription}`}
                </div>
                <div className="item-layers">
                  Layers: {item.layersIds.length > 0 ? item.layersIds.join(', ') : 'None assigned'}
                </div>
              </div>
              <div className="item-actions">
                <button 
                  className="btn small" 
                  onClick={() => {
                    const newName = prompt('Edit item name:', item.name);
                    if (newName) {
                      handleEditItem(index, { 
                        name: newName,
                        id: slug(newName)
                      });
                    }
                  }}
                >
                  Edit
                </button>
                <button 
                  className="btn danger small" 
                  onClick={() => handleRemoveItem(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}