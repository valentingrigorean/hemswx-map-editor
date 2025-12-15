import { useRef, useCallback } from 'preact/hooks';
import { useSignalEffect, type Signal } from '@preact/signals';
import { createLayerFromConfig, Basemap } from '../../../lib/arcgis';
import { jsonData } from '../../../lib/jsonStore';
import { previewBasemap, setPreviewBasemap } from '../../../lib/settings';
import type { LayerConfig } from '../../../lib/types';
import { DEFAULT_ARCGIS_BASEMAP } from './types';

interface UseBasemapOptions {
  mapInstance: React.MutableRefObject<__esri.Map | null>;
  viewReady: Signal<boolean>;
}

export function useBasemap({ mapInstance, viewReady }: UseBasemapOptions) {
  const lastAppliedBasemapRef = useRef<string>('');

  const applyBasemapToMap = useCallback(async (basemapId: string) => {
    const map = mapInstance.current;
    if (!map) return;

    let targetId = basemapId;
    let isCustom = false;

    if (!targetId) {
      targetId = DEFAULT_ARCGIS_BASEMAP.id;
    } else if (targetId.startsWith('custom:')) {
      isCustom = true;
      const rawId = targetId.replace('custom:', '');
      const exists = jsonData.value.baseMaps?.some(b => b.id === rawId);
      if (!exists) {
        targetId = DEFAULT_ARCGIS_BASEMAP.id;
        isCustom = false;
        setPreviewBasemap(DEFAULT_ARCGIS_BASEMAP.id);
      }
    }

    // Skip if it's the default basemap on first call - it's already set via HTML attribute
    if (!isCustom && targetId === DEFAULT_ARCGIS_BASEMAP.id && lastAppliedBasemapRef.current === '') {
      lastAppliedBasemapRef.current = targetId;
      return;
    }

    if (targetId === lastAppliedBasemapRef.current) return;
    lastAppliedBasemapRef.current = targetId;

    if (isCustom) {
      const customId = targetId.replace('custom:', '');
      const basemapEntity = jsonData.value.baseMaps?.find(b => b.id === customId);

      if (!basemapEntity) {
        map.basemap = Basemap.fromId(DEFAULT_ARCGIS_BASEMAP.id);
        return;
      }

      const [baseResults, refResults] = await Promise.all([
        Promise.all(basemapEntity.baseLayers.map(c => createLayerFromConfig(c as LayerConfig))),
        Promise.all(basemapEntity.referenceLayers.map(c => createLayerFromConfig(c as LayerConfig)))
      ]);

      const baseLayers = baseResults.filter(r => r.success && r.layer).map(r => r.layer!);
      const referenceLayers = refResults.filter(r => r.success && r.layer).map(r => r.layer!);

      map.basemap = new Basemap({
        baseLayers,
        referenceLayers,
        title: basemapEntity.name
      });
    } else {
      const newBasemap = Basemap.fromId(targetId);
      if (newBasemap) {
        map.basemap = newBasemap;
      } else {
        map.basemap = Basemap.fromId(DEFAULT_ARCGIS_BASEMAP.id);
      }
    }
  }, [mapInstance]);

  // Sync basemap when viewReady or previewBasemap changes
  useSignalEffect(() => {
    const ready = viewReady.value;
    const currentBasemapId = previewBasemap.value;
    if (!ready) return;
    applyBasemapToMap(currentBasemapId);
  });

  // Watch for custom basemap deletions
  useSignalEffect(() => {
    const current = previewBasemap.value;
    if (current.startsWith('custom:')) {
      const id = current.replace('custom:', '');
      const exists = jsonData.value.baseMaps?.some(b => b.id === id);
      if (!exists) {
        setPreviewBasemap(DEFAULT_ARCGIS_BASEMAP.id);
      }
    }
  });

  return { applyBasemapToMap };
}
