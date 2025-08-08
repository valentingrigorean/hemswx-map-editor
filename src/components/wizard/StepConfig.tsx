import { wizardState, updateWizardData } from '../../lib/jsonStore';

export default function StepConfig() {
  const wizard = wizardState.value;
  const data = wizard.data;

  const handleChange = (field: string, value: string | boolean) => {
    updateWizardData({ [field]: value });
  };

  return (
    <div>
      <h3>Feature Configuration</h3>
      
      <div className="form-group">
        <label className="form-label">Feature ID (for internationalization)</label>
        <input 
          type="text" 
          className="form-input"
          value={data.featureId}
          onChange={(e) => handleChange('featureId', (e.target as HTMLInputElement).value)}
          placeholder="e.g., 'wind', 'cloud', 'aviation_obstacle'"
        />
        <div className="form-help">
          Optional. Used as key for translations across languages (en, da, nb, sv).
        </div>
      </div>
      
      <div className="form-group">
        <label className="form-label">Display Name</label>
        <input 
          type="text" 
          className="form-input"
          value={data.featureName}
          onChange={(e) => handleChange('featureName', (e.target as HTMLInputElement).value)}
          placeholder="e.g., 'Wind (60 min)', 'Cloud Coverage'"
        />
        <div className="form-help">
          Optional. Visible name in UI.
        </div>
      </div>
      
      <div className="form-group">
        <label className="form-label">Presentation Style</label>
        <select 
          className="form-select"
          value={data.presentation}
          onChange={(e) => handleChange('presentation', (e.target as HTMLSelectElement).value)}
        >
          <option value="single">Single - Only one item can be active at a time</option>
          <option value="multiple">Multiple - Multiple items can be active simultaneously</option>
        </select>
      </div>
      
      {data.presentation === 'multiple' && (
        <div className="form-group">
          <label className="form-label">
            <input 
              type="checkbox" 
              className="form-checkbox"
              checked={data.mutuallyExclusive}
              onChange={(e) => handleChange('mutuallyExclusive', (e.target as HTMLInputElement).checked)}
            />
            Mutually Exclusive Items
          </label>
          <div className="form-help">
            When one item is selected, others are automatically deselected.
          </div>
        </div>
      )}
    </div>
  );
}
