import { MapLayersData } from './types';

export const slug = (s: string): string => 
  s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export const safeParse = (text: string): [any, string | null] => {
  try {
    return [JSON.parse(text), null];
  } catch (e) {
    return [null, e instanceof Error ? e.message : 'Parse error'];
  }
};

export const collectItemIds = (data: MapLayersData): Set<string> => {
  const ids = new Set<string>();
  
  const add = (x: string | undefined) => {
    if (x && typeof x === 'string') ids.add(x);
  };
  
  const scanGroupArr = (arr: any[]) => {
    for (const g of arr || []) {
      if (g.id) add(g.id);
      for (const it of g.items || []) {
        if (it.id) add(it.id);
        if (it.legendDescription) add(it.legendDescription);
      }
    }
  };
  
  scanGroupArr(data.weatherFeatures);
  scanGroupArr(data.features);
  return ids;
};

export const collectReferencedLayerIds = (data: MapLayersData): Set<string> => {
  const used = new Set<string>();
  
  const scan = (arr: any[]) => {
    for (const g of arr || []) {
      for (const it of g.items || []) {
        for (const lid of it.layersIds || []) {
          used.add(lid);
        }
      }
    }
  };
  
  scan(data.weatherFeatures);
  scan(data.features);
  return used;
};

export const getLayerUsage = (data: MapLayersData, layerId: string): Array<{
  featureType: 'weatherFeatures' | 'features';
  featureIndex: number;
  featureName: string;
  itemIndex: number;
  itemName: string;
}> => {
  const usage: Array<{
    featureType: 'weatherFeatures' | 'features';
    featureIndex: number;
    featureName: string;
    itemIndex: number;
    itemName: string;
  }> = [];
  
  const scanFeatureGroup = (arr: any[], featureType: 'weatherFeatures' | 'features') => {
    arr.forEach((feature, featureIndex) => {
      (feature.items || []).forEach((item: any, itemIndex: number) => {
        if ((item.layersIds || []).includes(layerId)) {
          usage.push({
            featureType,
            featureIndex,
            featureName: feature.name || feature.id || `${featureType} ${featureIndex + 1}`,
            itemIndex,
            itemName: item.name || item.id || `Item ${itemIndex + 1}`
          });
        }
      });
    });
  };
  
  scanFeatureGroup(data.weatherFeatures, 'weatherFeatures');
  scanFeatureGroup(data.features, 'features');
  return usage;
};

export const downloadBlob = (filename: string, content: string, mimeType = 'application/json') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const getDefaultData = (): MapLayersData => ({
  weatherFeatures: [],
  features: [],
  layers: [],
  intl: {
    en: {},
    da: {},
    nb: {},
    sv: {}
  }
});