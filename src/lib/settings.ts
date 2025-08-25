import { signal, computed } from '@preact/signals';

export interface AppSettings {
  customLogicLayers: Set<string>;
}

const SETTINGS_KEY = 'hemswx-map-editor-settings';

const defaultSettings: AppSettings = {
  customLogicLayers: new Set(['aviation_obstacle'])
};

// Load settings from localStorage
const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        customLogicLayers: new Set(parsed.customLogicLayers || ['aviation_obstacle'])
      };
    }
  } catch (error) {
    console.warn('Failed to load settings:', error);
  }
  return { ...defaultSettings, customLogicLayers: new Set(['aviation_obstacle']) };
};

// Save settings to localStorage
const saveSettings = (settings: AppSettings) => {
  try {
    const serializable = {
      customLogicLayers: Array.from(settings.customLogicLayers)
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