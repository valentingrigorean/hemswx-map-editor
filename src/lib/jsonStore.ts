import { signal, computed } from '@preact/signals';
import { MapLayersData, WizardData, AppState, LayerEntry, MapFeature } from './types';
import { getDefaultData } from './utils';
import { recomputeStats, summarizeData } from './parse';
import { syncTranslations, pruneTranslations } from './intl';
import { pruneUnusedLayers, deleteLayer } from './layers';

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
// Tracks whether the user has provided JSON (file/open/paste/drop)
export const hasJson = signal<boolean>(false);
export const selectedFeature = signal<{ type: 'weatherFeatures' | 'features' | null; index: number }>({
  type: null,
  index: -1
});
export const selectedLayer = signal<{ index: number }>({ index: -1 });

// Drafts for preserving unsaved edits by selection
// Use simple object maps for reactivity (avoid mutating Map in place)
export const layerDrafts = signal<Record<number | string, LayerEntry>>({});
export const featureDrafts = signal<{
  weatherFeatures: Record<number, MapFeature>;
  features: Record<number, MapFeature>;
}>({ weatherFeatures: {}, features: {} });

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
  hasJson.value = true;
  
  // Save to localStorage
  try {
    localStorage.setItem('hemswx-last-json-data', JSON.stringify(newData));
  } catch (error) {
    console.warn('Failed to save JSON data to localStorage:', error);
  }
  
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

// Load last JSON data from localStorage
export const loadLastJsonData = () => {
  try {
    const stored = localStorage.getItem('hemswx-last-json-data');
    if (stored) {
      const parsed = JSON.parse(stored);
      updateJsonData(parsed);
      setStatus('✅ Last session data loaded');
      return true;
    }
  } catch (error) {
    console.warn('Failed to load JSON data from localStorage:', error);
    setStatus('⚠️ Failed to load last session data');
  }
  return false;
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

// Draft helpers
export const getLayerDraft = (key: number | 'new') => layerDrafts.value[key];
export const setLayerDraft = (key: number | 'new', draft: LayerEntry) => {
  layerDrafts.value = { ...layerDrafts.value, [key]: draft } as any;
};
export const clearLayerDraft = (key: number | 'new') => {
  const next = { ...layerDrafts.value } as any;
  delete next[key];
  layerDrafts.value = next;
};

export const getFeatureDraft = (type: 'weatherFeatures' | 'features', index: number) => {
  return featureDrafts.value[type][index];
};
export const setFeatureDraft = (type: 'weatherFeatures' | 'features', index: number, draft: MapFeature) => {
  featureDrafts.value = {
    ...featureDrafts.value,
    [type]: {
      ...featureDrafts.value[type],
      [index]: draft
    }
  };
};
export const clearFeatureDraft = (type: 'weatherFeatures' | 'features', index: number) => {
  const nextType = { ...featureDrafts.value[type] } as any;
  delete nextType[index];
  featureDrafts.value = { ...featureDrafts.value, [type]: nextType };
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

// Reorder a feature within the same category
export const reorderFeature = (
  type: 'weatherFeatures' | 'features',
  fromIndex: number,
  toIndex: number
) => {
  const arr = [...jsonData.value[type]];
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= arr.length ||
    toIndex >= arr.length
  ) {
    return;
  }

  const [moved] = arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, moved);

  const updated = { ...jsonData.value, [type]: arr } as MapLayersData;
  updateJsonData(updated);

  // Maintain selection on moved item
  if (selectedFeature.value.type === type) {
    let selIdx = selectedFeature.value.index;
    if (selIdx === fromIndex) selIdx = toIndex;
    else if (fromIndex < selIdx && selIdx <= toIndex) selIdx -= 1;
    else if (toIndex <= selIdx && selIdx < fromIndex) selIdx += 1;
    selectedFeature.value = { type, index: selIdx };
  }

  setStatus('✅ Feature reordered');
};

// Move feature between categories (Weather ⇄ General)
export const moveFeatureCategory = (
  fromType: 'weatherFeatures' | 'features',
  index: number,
  toType: 'weatherFeatures' | 'features'
) => {
  if (fromType === toType) return;

  const updated: MapLayersData = JSON.parse(JSON.stringify(jsonData.value));
  const [moved] = updated[fromType].splice(index, 1);
  updated[toType].push(moved);

  updateJsonData(updated);

  // Select the moved feature at its new position
  const newIndex = updated[toType].length - 1;
  selectedFeature.value = { type: toType, index: newIndex };

  setStatus(`✅ Moved feature to ${toType === 'weatherFeatures' ? 'Weather' : 'General'}`);
};

// Move feature to a specific index across categories
export const moveFeatureToIndex = (
  fromType: 'weatherFeatures' | 'features',
  fromIndex: number,
  toType: 'weatherFeatures' | 'features',
  toIndex: number
) => {
  const src = [...jsonData.value[fromType]];
  const dst = fromType === toType ? src : [...jsonData.value[toType]];

  if (
    fromIndex < 0 || fromIndex >= src.length ||
    toIndex < 0 || toIndex > dst.length
  ) {
    return;
  }

  const [moved] = src.splice(fromIndex, 1);
  // Adjust target index if moving within same array and fromIndex < toIndex
  const adjustedToIndex = (fromType === toType && fromIndex < toIndex) ? toIndex - 1 : toIndex;
  dst.splice(adjustedToIndex, 0, moved);

  const updated: MapLayersData = {
    ...jsonData.value,
    [fromType]: fromType === toType ? dst : src,
    [toType]: dst
  } as any;

  updateJsonData(updated);

  selectedFeature.value = { type: toType, index: adjustedToIndex };
  setStatus('✅ Feature moved');
};

export const deleteLayerByIndex = (index: number) => {
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
