import { useComputed } from '@preact/signals';
import { wizardState, jsonData } from '../../lib/jsonStore';

export default function StepReview() {
  const wizard = wizardState.value;
  const data = wizard.data;

  const validation = useComputed(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const success: string[] = [];

    // Check if we have items
    if (data.items.length === 0) {
      errors.push('No items have been added to this feature');
    } else {
      success.push(`✅ ${data.items.length} item(s) configured`);
    }

    // Check layer assignments
    const unassignedItems = data.items.filter(item => item.layersIds.length === 0);
    if (unassignedItems.length > 0) {
      warnings.push(`⚠️ ${unassignedItems.length} item(s) have no layer assignments: ${unassignedItems.map(i => i.name).join(', ')}`);
    }

    const assignedItems = data.items.filter(item => item.layersIds.length > 0);
    if (assignedItems.length > 0) {
      success.push(`✅ ${assignedItems.length} item(s) have layer assignments`);
    }

    // Check for missing layers
    const allReferencedLayers = new Set<string>();
    data.items.forEach(item => {
      item.layersIds.forEach(layerId => allReferencedLayers.add(layerId));
    });

    const availableLayers = new Set((jsonData.value.layers || []).map(l => l.id));
    const missingLayers = [...allReferencedLayers].filter(id => !availableLayers.has(id));
    
    if (missingLayers.length > 0) {
      errors.push(`❌ Referenced layers not found in JSON: ${missingLayers.join(', ')}`);
    }

    // Check for duplicate item IDs
    const itemIds = data.items.map(item => item.id);
    const duplicateIds = itemIds.filter((id, index) => itemIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`❌ Duplicate item IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
    }

    return { errors, warnings, success };
  });

  const generatedFeature = useComputed(() => {
    const feature = {
      id: data.featureId || undefined,
      name: data.featureName || undefined,
      presentation: data.presentation,
      mutuallyExclusive: data.mutuallyExclusive || undefined,
      items: data.items.map(item => ({
        id: item.id,
        name: item.name,
        showLegend: item.showLegend,
        legendUrl: item.legendUrl || undefined,
        legendDescription: item.legendDescription || undefined,
        layersIds: item.layersIds
      }))
    };

    // Clean up undefined values for preview
    const cleanFeature = JSON.parse(JSON.stringify(feature, (key, value) => 
      value === undefined ? undefined : value
    ));

    return cleanFeature;
  });

  return (
    <div>
      <h3>Review Your Feature</h3>
      
      <div className="validation-results">
        {validation.value.errors.map((error, i) => (
          <div key={`error-${i}`} className="validation-item error">
            {error}
          </div>
        ))}
        
        {validation.value.warnings.map((warning, i) => (
          <div key={`warning-${i}`} className="validation-item warning">
            {warning}
          </div>
        ))}
        
        {validation.value.success.map((success, i) => (
          <div key={`success-${i}`} className="validation-item success">
            {success}
          </div>
        ))}
        
        {validation.value.errors.length === 0 && validation.value.warnings.length === 0 && (
          <div className="validation-item success">
            🎉 Feature is ready to be {wizard.mode === 'edit' ? 'updated' : 'created'}!
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Generated JSON Preview</label>
        <textarea 
          className="form-textarea"
          value={JSON.stringify(generatedFeature.value, null, 2)}
          readonly
          style={{ height: '300px', fontSize: '11px' }}
        />
      </div>

      {/* Feature Summary */}
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        background: 'var(--input-bg)', 
        borderRadius: '8px',
        fontSize: '12px'
      }}>
        <div className="form-label">Feature Summary:</div>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', color: 'var(--muted)' }}>
          <li><strong>Type:</strong> {data.featureType === 'weatherFeature' ? 'Weather Feature' : 'General Feature'}</li>
          {data.featureId && <li><strong>ID:</strong> {data.featureId}</li>}
          {data.featureName && <li><strong>Name:</strong> {data.featureName}</li>}
          <li><strong>Presentation:</strong> {data.presentation}</li>
          {data.mutuallyExclusive && <li><strong>Mutually Exclusive:</strong> Yes</li>}
          <li><strong>Items:</strong> {data.items.length}</li>
          <li><strong>Total Layer Associations:</strong> {data.items.reduce((sum, item) => sum + item.layersIds.length, 0)}</li>
        </ul>
      </div>
    </div>
  );
}