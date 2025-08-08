class AppState {
  constructor() {
    this.data = { weatherFeatures: [], features: [], layers: [], intl: { en:{} } };
    this.selected = { type: null, index: -1 };
    this.wizard = {
      mode: 'create',
      currentStep: 1,
      editingIndex: -1,
      editingType: '',
      data: this.getEmptyWizardData()
    };
  }

  getEmptyWizardData() {
    return {
      featureType: 'weatherFeature',
      featureId: '',
      featureName: '',
      presentation: 'single',
      mutuallyExclusive: false,
      items: []
    };
  }

  reset() {
    this.wizard = {
      mode: 'create',
      currentStep: 1,
      editingIndex: -1,
      editingType: '',
      data: this.getEmptyWizardData()
    };
  }
}
