import { useComputed } from '@preact/signals';
import { 
  wizardState, 
  closeWizard, 
  setWizardStep,
  jsonData,
  updateJsonData,
  setStatus
} from '../../lib/jsonStore';
import StepType from './StepType';
import StepConfig from './StepConfig';
import StepItems from './StepItems';
import StepLayers from './StepLayers';
import StepReview from './StepReview';

const STEPS = [
  { id: 1, title: 'Feature Type' },
  { id: 2, title: 'Configuration' },
  { id: 3, title: 'Add Items' },
  { id: 4, title: 'Layer Association' },
  { id: 5, title: 'Review & Save' }
];

export default function WizardModal() {
  const wizard = wizardState.value;
  const currentStep = wizard.currentStep;

  const canGoNext = useComputed(() => {
    const data = wizard.data;
    switch (currentStep) {
      case 1:
        return true; // Feature type is always selected
      case 2:
        return true; // Configuration is optional
      case 3:
        return data.items.length > 0;
      case 4:
        return data.items.every(item => item.layersIds.length > 0);
      case 5:
        return true;
      default:
        return false;
    }
  });

  const canGoPrev = currentStep > 1;
  const isLastStep = currentStep === 5;

  const handleClose = () => {
    closeWizard();
  };

  const handlePrevious = () => {
    if (canGoPrev) {
      setWizardStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext.value) {
      setWizardStep(currentStep + 1);
    }
  };

  const handleSave = () => {
    const data = wizard.data;
    
    // Create the feature object
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

    // Clean up undefined values (but preserve empty arrays)
    Object.keys(feature).forEach(key => {
      const value = feature[key as keyof typeof feature];
      if (value === undefined) {
        delete feature[key as keyof typeof feature];
      }
    });

    // Ensure layersIds are preserved for each item
    feature.items.forEach(item => {
      if (!item.layersIds) {
        item.layersIds = [];
      }
    });

    const updatedData = { ...jsonData.value };
    const featureArray = data.featureType === 'weatherFeature' 
      ? updatedData.weatherFeatures 
      : updatedData.features;

    if (wizard.mode === 'edit' && wizard.editingIndex >= 0) {
      // Update existing feature
      featureArray[wizard.editingIndex] = feature;
    } else {
      // Add new feature
      featureArray.push(feature);
    }

    updateJsonData(updatedData);
    setStatus(`✅ Feature "${feature.name || feature.id}" ${wizard.mode === 'edit' ? 'updated' : 'created'} successfully`);
    closeWizard();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <StepType />;
      case 2:
        return <StepConfig />;
      case 3:
        return <StepItems />;
      case 4:
        return <StepLayers />;
      case 5:
        return <StepReview />;
      default:
        return null;
    }
  };

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'active';
    return 'pending';
  };

  return (
    <div className="wizard-modal active">
      <div className="wizard-content">
        <div className="wizard-header">
          <h2>
            {wizard.mode === 'edit' ? 'Edit Feature' : 'Create New Feature'} - Multi-Step Wizard
          </h2>
        </div>
        
        <div className="wizard-body">
          <div className="wizard-layout">
            <div className="wizard-sidebar">
              <div className="stepper">
                {STEPS.map(step => (
                  <div 
                    key={step.id} 
                    className={`stepper-item ${getStepStatus(step.id)}`}
                  >
                    <div className="stepper-number">
                      <span>{step.id}</span>
                    </div>
                    <div className="stepper-label">{step.title}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="wizard-main">
              <div className="step-content active">
                {renderStepContent()}
              </div>
            </div>
          </div>
        </div>
        
        <div className="wizard-footer">
          <button 
            className="btn" 
            onClick={handlePrevious}
            disabled={!canGoPrev}
          >
            ← Previous
          </button>
          
          {!isLastStep ? (
            <button 
              className="btn primary" 
              onClick={handleNext}
              disabled={!canGoNext.value}
            >
              Next →
            </button>
          ) : (
            <button 
              className="btn success" 
              onClick={handleSave}
            >
              ✨ {wizard.mode === 'edit' ? 'Update Feature' : 'Create Feature'}
            </button>
          )}
          
          <button className="btn ghost" onClick={handleClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}