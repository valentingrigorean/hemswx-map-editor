import { signal, computed } from '@preact/signals';
import { MapLayersData, WizardData, AppState } from './types';
import { getDefaultData } from './utils';
import { recomputeStats, summarizeData } from './parse';
import { syncTranslations, pruneTranslations } from './intl';
import { pruneUnusedLayers } from './layers';

const createDefaultWizardData = (): WizardData => ({
  featureType: 'weatherFeature',
  featureId: '',
  featureName: '',
  presentation: 'single',
  mutuallyExclusive: false,
  items: []
});

// Core data signals
export const jsonData = signal<MapLayersData>(getDefaultData());
export const selectedFeature = signal<{ type: 'weatherFeatures' | 'features' | null; index: number }>({
  type: null,
  index: -1
});
export const selectedLayer = signal<{ index: number }>({ index: -1 });

// UI state signals
export const activeTab = signal<'features' | 'layers' | 'tools' | 'internationalization' | 'stats'>('features');
export const activeRightTab = signal<'json' | 'feature' | 'layer'>('json');
export const activeIntlLang = signal<'en' | 'da' | 'nb' | 'sv'>('en');
export const statusMessage = signal<string>('Ready');

// Wizard state
export const wizardState = signal<{
  mode: 'create' | 'edit';
  currentStep: number;
  isOpen: boolean;
  data: WizardData;
  editingIndex: number;
  editingType: 'weatherFeature' | 'feature';
}>({
  mode: 'create',
  currentStep: 1,
  isOpen: false,
  data: createDefaultWizardData(),
  editingIndex: -1,
  editingType: 'weatherFeature'
});

// Computed values
export const jsonText = computed(() => JSON.stringify(jsonData.value, null, 2));
export const dataStats = computed(() => recomputeStats(jsonData.value));
export const dataSummary = computed(() => summarizeData(jsonData.value));

export const selectedFeatureData = computed(() => {
  const selection = selectedFeature.value;
  if (selection.type === null || selection.index < 0) return null;
  
  const featureArray = jsonData.value[selection.type];
  return featureArray[selection.index] || null;
});

export const selectedLayerData = computed(() => {
  const selection = selectedLayer.value;
  if (selection.index < 0) return null;
  
  return jsonData.value.layers[selection.index] || null;
});

// Actions
export const updateJsonData = (newData: MapLayersData) => {
  jsonData.value = newData;
  // Clear selections if they're out of bounds
  const selection = selectedFeature.value;
  if (selection.type && selection.index >= 0) {
    const featureArray = newData[selection.type];
    if (selection.index >= featureArray.length) {
      selectedFeature.value = { type: null, index: -1 };
    }
  }
  
  const layerSelection = selectedLayer.value;
  if (layerSelection.index >= 0 && layerSelection.index >= newData.layers.length) {
    selectedLayer.value = { index: -1 };
  }
};

export const setStatus = (message: string) => {
  statusMessage.value = message;
  // Auto-clear status after 5 seconds
  setTimeout(() => {
    if (statusMessage.value === message) {
      statusMessage.value = 'Ready';
    }
  }, 5000);
};

export const selectFeature = (type: 'weatherFeatures' | 'features', index: number) => {
  selectedFeature.value = { type, index };
  activeRightTab.value = 'feature';
};

export const selectLayer = (index: number) => {
  selectedLayer.value = { index };
  activeRightTab.value = 'layer';
};

export const openWizard = (mode: 'create' | 'edit' = 'create', featureType: 'weatherFeature' | 'feature' = 'weatherFeature', featureIndex = -1) => {
  const newWizardState = {
    mode,
    currentStep: 1,
    isOpen: true,
    data: createDefaultWizardData(),
    editingIndex: featureIndex,
    editingType: featureType
  };
  
  if (mode === 'edit' && featureIndex >= 0) {
    const featureArray = featureType === 'weatherFeature' ? jsonData.value.weatherFeatures : jsonData.value.features;
    const feature = featureArray[featureIndex];
    
    if (feature) {
      newWizardState.data = {
        featureType,
        featureId: feature.id || '',
        featureName: feature.name || '',
        presentation: feature.presentation || 'single',
        mutuallyExclusive: feature.mutuallyExclusive || false,
        items: (feature.items || []).map(item => ({
          id: item.id,
          name: item.name,
          showLegend: item.showLegend || false,
          legendUrl: item.legendUrl || '',
          legendDescription: item.legendDescription || '',
          layersIds: [...(item.layersIds || [])]
        }))
      };
    }
  }
  
  wizardState.value = newWizardState;
};

export const closeWizard = () => {
  wizardState.value = {
    ...wizardState.value,
    isOpen: false
  };
};

export const updateWizardData = (updates: Partial<WizardData>) => {
  wizardState.value = {
    ...wizardState.value,
    data: { ...wizardState.value.data, ...updates }
  };
};

export const setWizardStep = (step: number) => {
  wizardState.value = {
    ...wizardState.value,
    currentStep: step
  };
};

// Data manipulation actions
export const syncMissingTranslations = () => {
  const synced = syncTranslations(jsonData.value);
  updateJsonData(synced);
  setStatus('✅ Missing translations synchronized');
};

export const pruneUnused = () => {
  let updated = pruneTranslations(jsonData.value);
  updated = pruneUnusedLayers(updated);
  updateJsonData(updated);
  setStatus('✅ Unused translations and layers removed');
};

export const deleteFeature = (type: 'weatherFeatures' | 'features', index: number) => {
  const updated = { ...jsonData.value };
  updated[type] = updated[type].filter((_, i) => i !== index);
  updateJsonData(updated);
  
  // Clear selection if deleted feature was selected
  const selection = selectedFeature.value;
  if (selection.type === type && selection.index === index) {
    selectedFeature.value = { type: null, index: -1 };
  } else if (selection.type === type && selection.index > index) {
    selectedFeature.value = { ...selection, index: selection.index - 1 };
  }
  
  setStatus('✅ Feature deleted');
};

export const deleteLayer = (index: number) => {
  const updated = { ...jsonData.value };
  updated.layers = updated.layers.filter((_, i) => i !== index);
  updateJsonData(updated);
  
  // Clear selection if deleted layer was selected
  const selection = selectedLayer.value;
  if (selection.index === index) {
    selectedLayer.value = { index: -1 };
  } else if (selection.index > index) {
    selectedLayer.value = { index: selection.index - 1 };
  }
  
  setStatus('✅ Layer deleted');
};