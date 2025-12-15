import type { LayerEntry, LayerConfig, MapFeature, BaseMapEntity } from '../../../lib/types';

export type PreviewMode = 'layer' | 'feature' | 'basemap';

export interface MapPreviewPanelProps {
  layer?: LayerEntry | null;
  feature?: MapFeature | null;
  basemap?: BaseMapEntity | null;
  selectedSublayerIndex?: number;
  mode?: PreviewMode;
}

export interface PreviewLayerEntry {
  key: string;
  config: LayerConfig;
  opacity: number;
  zIndex: number;
  originalIndex: number;
}

export interface CustomLegend {
  name: string;
  url: string;
  description?: string;
}

export const DEFAULT_ARCGIS_BASEMAP = { id: 'gray-vector', name: 'Light Gray' };
