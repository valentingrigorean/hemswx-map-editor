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

// Layer types matching Dart LayerType enum
export type LayerType = 'wms' | 'tiled' | 'mapImage' | 'portalItem' | 'vectorTiled' | 'feature' | 'wmts' | 'sceneLayer' | 'unknown';

// Source kind for disambiguating layer source interpretation
export type LayerSourceKind = 'uri' | 'portalItem';

// Map dimension for 2D/3D gating
export type MapDimension = 'map' | 'scene';

// A single renderable layer definition (sublayer)
export interface LayerConfig {
  type: LayerType;
  source: string;
  sourceKind?: LayerSourceKind;
  zIndex?: number;
  refreshInterval?: number;
  supportedDimensions?: MapDimension[];
  sceneProperties?: Record<string, any>;
  options?: {
    layerId?: string | number;
    layerNames?: string[];
    opacity?: number;
    [key: string]: any;
  };
}

// Map layer entity used in basemaps (baseLayers/referenceLayers)
export interface MapLayerEntity {
  type: LayerType;
  source: string;
  sourceKind?: LayerSourceKind;
  zIndex?: number;
  refreshInterval?: number;
  supportedDimensions?: MapDimension[];
  sceneProperties?: Record<string, any>;
  options?: {
    layerId?: string | number;
    layerNames?: string[];
    opacity?: number;
    [key: string]: any;
  };
}

// Country codes for basemap filtering
export type MapCountry = 'world' | 'no' | 'se' | 'dk' | 'fi';

// Unit type for basemap
export type UnitType = 'metric' | 'aviation' | 'nautical';

// Elevation source types
export type ElevationSourceType = 'tiledElevation' | 'portalItemElevation';

// Elevation source entity for 3D scenes
export interface ElevationSourceEntity {
  id: string;
  type: ElevationSourceType;
  source: string;
  options?: Record<string, any>;
}

// Scene configuration for 3D
export interface SceneConfigurationEntity {
  elevationSources?: ElevationSourceEntity[];
  atmosphereEffect?: string;
  sunLightingEnabled?: boolean;
}

// Basemap entity - API-driven basemap definition
export interface BaseMapEntity {
  id: string;
  name: string;
  thumbnailUrl?: string;
  thumbnailBase64?: string;
  countries?: MapCountry[];
  unitType?: UnitType;
  baseLayers: MapLayerEntity[];
  referenceLayers: MapLayerEntity[];
  scene?: SceneConfigurationEntity;
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
  baseMaps?: BaseMapEntity[];
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

export interface AppState {
  data: MapLayersData;
  selectedFeature: {
    type: 'weatherFeatures' | 'features' | null;
    index: number;
  };
  selectedLayer: {
    index: number;
  };
  selectedBasemap: {
    index: number;
  };
  ui: {
    activeTab: 'workspace' | 'basemaps' | 'json' | 'settings';
    activeRightTab: 'json' | 'feature' | 'layer';
    status: string;
  };
}

export type TreeSelection =
  | { type: 'feature'; featureType: 'weatherFeatures' | 'features'; index: number; itemIndex?: number }
  | { type: 'layer'; index: number }
  | null;
