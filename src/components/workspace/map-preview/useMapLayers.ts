import { useRef, useCallback } from 'preact/hooks';
import { useSignal, useSignalEffect, batch, type Signal, type ReadonlySignal } from '@preact/signals';
import { createLayerFromConfig, arcgisState } from '../../../lib/arcgis';
import type { LayerConfig } from '../../../lib/types';
import { buildPreviewLayerEntries, safeDestroyLayer } from './utils';

interface UseMapLayersOptions {
  layerConfigs: ReadonlySignal<LayerConfig[]>;
  mapInstance: React.MutableRefObject<__esri.Map | null>;
  viewReady: Signal<boolean>;
}

interface UseMapLayersResult {
  isLoading: Signal<boolean>;
  loadedLayerCount: Signal<number>;
  hasTimeAwareLayers: Signal<boolean>;
  error: Signal<string | null>;
  cleanup: () => void;
}

export function useMapLayers({
  layerConfigs,
  mapInstance,
  viewReady
}: UseMapLayersOptions): UseMapLayersResult {
  const isLoading = useSignal(false);
  const loadedLayerCount = useSignal(0);
  const hasTimeAwareLayers = useSignal(false);
  const error = useSignal<string | null>(null);

  const layerRegistryRef = useRef<Map<string, __esri.Layer>>(new Map());

  const cleanup = useCallback(() => {
    layerRegistryRef.current.forEach(layer => safeDestroyLayer(layer));
    layerRegistryRef.current.clear();
  }, []);

  useSignalEffect(() => {
    const configs = layerConfigs.value;
    const initialized = arcgisState.value.initialized;
    const ready = viewReady.value;
    const map = mapInstance.current;

    if (!map || !ready || !initialized) return;

    const desiredEntries = buildPreviewLayerEntries(configs);
    const desiredKeys = new Set(desiredEntries.map(e => e.key));

    // 1. Remove obsolete layers
    for (const [key, layer] of Array.from(layerRegistryRef.current.entries())) {
      if (!desiredKeys.has(key)) {
        map.layers.remove(layer);
        safeDestroyLayer(layer);
        layerRegistryRef.current.delete(key);
      }
    }

    // 2. Update existing layer opacity
    desiredEntries.forEach((entry) => {
      const layer = layerRegistryRef.current.get(entry.key);
      if (layer && layer.opacity !== entry.opacity) {
        layer.opacity = entry.opacity;
      }
    });

    // 3. Identify missing layers
    const missingEntries = desiredEntries.filter(entry => !layerRegistryRef.current.has(entry.key));

    if (missingEntries.length > 0) {
      batch(() => {
        isLoading.value = true;
        error.value = null;
      });

      Promise.all(missingEntries.map(async entry => {
        try {
          const result = await createLayerFromConfig(entry.config);
          if (result.success && result.layer) {
            result.layer.opacity = entry.opacity;
            return { key: entry.key, layer: result.layer };
          }
          if (result.error) console.warn(`Layer error ${entry.key}:`, result.error);
          return null;
        } catch (e) {
          console.warn(`Layer exception ${entry.key}:`, e);
          return null;
        }
      })).then(results => {
        if (!mapInstance.current) return;

        results.forEach(res => {
          if (res) {
            const currentConfigs = layerConfigs.value;
            const stillNeeded = buildPreviewLayerEntries(currentConfigs).some(e => e.key === res.key);

            if (stillNeeded) {
              map.layers.add(res.layer);
              layerRegistryRef.current.set(res.key, res.layer);
            } else {
              safeDestroyLayer(res.layer);
            }
          }
        });

        // 4. Reorder layers
        const currentEntries = buildPreviewLayerEntries(layerConfigs.value);
        currentEntries.forEach((entry, index) => {
          const layer = layerRegistryRef.current.get(entry.key);
          if (layer) {
            map.layers.reorder(layer, index);
          }
        });

        batch(() => {
          isLoading.value = false;
          loadedLayerCount.value = map.layers.length;
        });
      });
    } else {
      // Just reorder if nothing missing - ensure loading is false
      desiredEntries.forEach((entry, index) => {
        const layer = layerRegistryRef.current.get(entry.key);
        if (layer) {
          map.layers.reorder(layer, index);
        }
      });
      batch(() => {
        isLoading.value = false;
        loadedLayerCount.value = map.layers.length;
      });
    }

    // Check for WMS layers (time-aware)
    const wmsConfigs = desiredEntries.filter(e => e.config.type === 'wms');
    hasTimeAwareLayers.value = wmsConfigs.length > 0;
  });

  return {
    isLoading,
    loadedLayerCount,
    hasTimeAwareLayers,
    error,
    cleanup
  };
}
