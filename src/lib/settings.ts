import { signal, computed } from '@preact/signals';

export interface AppSettings {
  customLogicLayers: Set<string>;
  nonTranslatableKeys: Set<string>;
}

const SETTINGS_KEY = 'hemswx-map-editor-settings';

const defaultSettings: AppSettings = {
  customLogicLayers: new Set(['aviation_obstacle']),
  nonTranslatableKeys: new Set()
};

// Load settings from localStorage
const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        customLogicLayers: new Set(parsed.customLogicLayers || ['aviation_obstacle']),
        nonTranslatableKeys: new Set(parsed.nonTranslatableKeys || [])
      };
    }
  } catch (error) {
    console.warn('Failed to load settings:', error);
  }
  return { ...defaultSettings };
};

// Save settings to localStorage
const saveSettings = (settings: AppSettings) => {
  try {
    const serializable = {
      customLogicLayers: Array.from(settings.customLogicLayers),
      nonTranslatableKeys: Array.from(settings.nonTranslatableKeys)
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.warn('Failed to save settings:', error);
  }
};

// Settings signal
export const settings = signal<AppSettings>(loadSettings());

// Computed helpers
export const customLogicLayers = computed(() => settings.value.customLogicLayers);

// Actions
export const addCustomLogicLayer = (layerId: string) => {
  const newCustomLayers = new Set(settings.value.customLogicLayers);
  newCustomLayers.add(layerId);
  const newSettings = { ...settings.value, customLogicLayers: newCustomLayers };
  settings.value = newSettings;
  saveSettings(newSettings);
};

export const removeCustomLogicLayer = (layerId: string) => {
  const newCustomLayers = new Set(settings.value.customLogicLayers);
  newCustomLayers.delete(layerId);
  const newSettings = { ...settings.value, customLogicLayers: newCustomLayers };
  settings.value = newSettings;
  saveSettings(newSettings);
};

export const isCustomLogicLayer = (layerId: string): boolean => {
  return settings.value.customLogicLayers.has(layerId);
};

export const toggleCustomLogicLayer = (layerId: string) => {
  if (isCustomLogicLayer(layerId)) {
    removeCustomLogicLayer(layerId);
  } else {
    addCustomLogicLayer(layerId);
  }
};

// Non-translatable keys helpers
export const nonTranslatableKeys = computed(() => settings.value.nonTranslatableKeys);

export const addNonTranslatableKey = (key: string) => {
  const newKeys = new Set(settings.value.nonTranslatableKeys);
  newKeys.add(key);
  const newSettings = { ...settings.value, nonTranslatableKeys: newKeys };
  settings.value = newSettings;
  saveSettings(newSettings);
};

export const removeNonTranslatableKey = (key: string) => {
  const newKeys = new Set(settings.value.nonTranslatableKeys);
  newKeys.delete(key);
  const newSettings = { ...settings.value, nonTranslatableKeys: newKeys };
  settings.value = newSettings;
  saveSettings(newSettings);
};

export const isNonTranslatableKey = (key: string): boolean => {
  return settings.value.nonTranslatableKeys.has(key);
};

export const toggleNonTranslatableKey = (key: string) => {
  if (isNonTranslatableKey(key)) {
    removeNonTranslatableKey(key);
  } else {
    addNonTranslatableKey(key);
  }
};