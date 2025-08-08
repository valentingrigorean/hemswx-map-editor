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

// A single renderable layer definition (sublayer)
export interface LayerConfig {
  type: 'wms' | 'tiled' | 'mapImage' | 'portalItem' | 'vectorTiled' | 'feature';
  source?: string;
  opacity?: number;
  zIndex?: number;
  options?: {
    layerId?: string | number;
    layerNames?: string[];
    [key: string]: any;
  };
}

// A layer entry groups one or more sublayers under a single id
export interface LayerEntry {
  id: string;
  layers: LayerConfig[];
}

export interface IntlDict {
  [key: string]: string;
}

export interface MapLayersData {
  weatherFeatures: MapFeature[];
  features: MapFeature[];
  layers: LayerEntry[];
  intl: {
    en: IntlDict;
    da: IntlDict;
    nb: IntlDict;
    sv: IntlDict;
    [key: string]: IntlDict;
  };
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
  ui: {
    activeTab: 'features' | 'layers' | 'tools' | 'internationalization' | 'stats';
    activeRightTab: 'json' | 'feature' | 'layer';
    activeIntlLang: 'en' | 'da' | 'nb' | 'sv';
    status: string;
  };
}
