export interface MapLayerItem {
  id: string;
  name: string;
  showLegend?: boolean;
  legendUrl?: string;
  legendDescription?: string;
  layersIds?: string[];
}

export interface MapFeature {
  id?: string;
  name?: string;
  presentation: 'single' | 'multiple';
  mutuallyExclusive?: boolean;
  items: MapLayerItem[];
}

export interface LayerConfig {
  id: string;
  type: 'wms' | 'tiled' | 'mapImage' | 'portalItem';
  source?: string;
  opacity?: number;
  zIndex?: number;
  layerNames?: string;
  options?: {
    layerId?: string;
    [key: string]: any;
  };
}

export interface IntlDict {
  [key: string]: string;
}

export interface MapLayersData {
  weatherFeatures: MapFeature[];
  features: MapFeature[];
  layers: LayerConfig[];
  intl: {
    en: IntlDict;
    da: IntlDict;
    nb: IntlDict;
    sv: IntlDict;
    [key: string]: IntlDict;
  };
}

export interface WizardItemData {
  id: string;
  name: string;
  showLegend: boolean;
  legendUrl?: string;
  legendDescription?: string;
  layersIds: string[];
}

export interface WizardData {
  featureType: 'weatherFeature' | 'feature';
  featureId: string;
  featureName: string;
  presentation: 'single' | 'multiple';
  mutuallyExclusive: boolean;
  items: WizardItemData[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StatsData {
  missingLayers: string[];
  unusedLayers: string[];
  missingIntl: {
    [lang: string]: string[];
  };
  weatherFeatureCount: number;
  featureCount: number;
  layerCount: number;
  languageCount: number;
}

export interface AppState {
  data: MapLayersData;
  selectedFeature: {
    type: 'weatherFeatures' | 'features' | null;
    index: number;
  };
  selectedLayer: {
    index: number;
  };
  wizard: {
    mode: 'create' | 'edit';
    currentStep: number;
    isOpen: boolean;
    data: WizardData;
    editingIndex: number;
    editingType: 'weatherFeature' | 'feature';
  };
  ui: {
    activeTab: 'features' | 'layers' | 'tools' | 'internationalization' | 'stats';
    activeRightTab: 'json' | 'feature' | 'layer';
    activeIntlLang: 'en' | 'da' | 'nb' | 'sv';
    status: string;
  };
}