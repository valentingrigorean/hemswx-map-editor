import { wizardState, updateWizardData } from '../../lib/jsonStore';

export default function StepType() {
  const wizard = wizardState.value;
  const data = wizard.data;

  const handleFeatureTypeChange = (featureType: 'weatherFeature' | 'feature') => {
    updateWizardData({ featureType });
  };

  return (
    <div>
      <h3>Choose Feature Type</h3>
      <div className="form-group">
        <label className="form-radio">
          <input 
            type="radio" 
            name="featureType" 
            value="weatherFeature"
            checked={data.featureType === 'weatherFeature'}
            onChange={() => handleFeatureTypeChange('weatherFeature')}
          />
          <strong>Weather Feature</strong>
          <div className="form-help">
            Weather-related layers (wind, precipitation, temperature, clouds, radar, etc.)
          </div>
        </label>
        
        <label className="form-radio">
          <input 
            type="radio" 
            name="featureType" 
            value="feature"
            checked={data.featureType === 'feature'}
            onChange={() => handleFeatureTypeChange('feature')}
          />
          <strong>General Feature</strong>
          <div className="form-help">
            Non-weather features (terrain, obstacles, POI, navigation aids, etc.)
          </div>
        </label>
      </div>
    </div>
  );
}