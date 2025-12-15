import { useEffect, useRef, useCallback } from 'preact/hooks';
import { useSignal, useComputed } from '@preact/signals';
import { arcgisCredentials } from '../../../lib/credentials';
import {
  initializeArcGIS,
  arcgisState,
  signInWithOAuth,
  signOutFromOAuth,
  isOAuthConfigured,
  PORTAL_URL
} from '../../../lib/arcgis';
import { jsonData } from '../../../lib/jsonStore';
import { previewBasemap, setPreviewBasemap } from '../../../lib/settings';
import type { LayerConfig, BaseMapEntity, FeatureItem } from '../../../lib/types';
import type { MapPreviewPanelProps, CustomLegend } from './types';
import { DEFAULT_ARCGIS_BASEMAP } from './types';
import { useMapLayers } from './useMapLayers';
import { useBasemap } from './useBasemap';
import { LayerVisibilityPanel } from './LayerVisibilityPanel';
import { LegendPanel } from './LegendPanel';
import { safeDestroyLayer } from './utils';

// Separate component to handle Calcite dropdown events properly
function BasemapDropdown({
  currentBasemap,
  customBasemaps,
  onSelect
}: {
  currentBasemap: string;
  customBasemaps: BaseMapEntity[];
  onSelect: (id: string) => void;
}) {
  const dropdownRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const dropdown = dropdownRef.current;
    if (!dropdown) return;

    const handleSelect = (event: any) => {
      const selectedItem = event.target;
      const basemapId = selectedItem?.getAttribute('data-basemap-id');
      if (basemapId) {
        onSelect(basemapId);
      }
    };

    dropdown.addEventListener('calciteDropdownItemSelect', handleSelect);

    return () => {
      dropdown.removeEventListener('calciteDropdownItemSelect', handleSelect);
    };
  }, [onSelect]);

  return (
    <calcite-dropdown ref={dropdownRef} placement="bottom-end" scale="s">
      <calcite-button slot="trigger" appearance="outline-fill" scale="s" kind="neutral" icon-start="basemap">
        Basemap
      </calcite-button>
      <calcite-dropdown-item
        data-basemap-id={DEFAULT_ARCGIS_BASEMAP.id}
        selected={currentBasemap === DEFAULT_ARCGIS_BASEMAP.id || undefined}
      >
        {DEFAULT_ARCGIS_BASEMAP.name} (Standard)
      </calcite-dropdown-item>
      {customBasemaps.length > 0 && (
        <calcite-dropdown-group group-title="Custom Basemaps">
          {customBasemaps.map((bm: BaseMapEntity) => (
            <calcite-dropdown-item
              key={bm.id}
              data-basemap-id={`custom:${bm.id}`}
              selected={currentBasemap === `custom:${bm.id}` || undefined}
            >
              {bm.name}
            </calcite-dropdown-item>
          ))}
        </calcite-dropdown-group>
      )}
    </calcite-dropdown>
  );
}

declare global {
  namespace preact.JSX {
    interface IntrinsicElements {
      'arcgis-map': any;
      'arcgis-legend': any;
      'arcgis-time-slider': any;
      'arcgis-zoom': any;
      'calcite-panel': any;
      'calcite-button': any;
      'calcite-checkbox': any;
      'calcite-list': any;
      'calcite-list-item': any;
      'calcite-switch': any;
      'calcite-card': any;
      'calcite-dropdown': any;
      'calcite-dropdown-group': any;
      'calcite-dropdown-item': any;
      'calcite-loader': any;
      'calcite-label': any;
      'calcite-icon': any;
      'calcite-action': any;
      'calcite-notice': any;
    }
  }
}

export default function MapPreviewPanel(props: MapPreviewPanelProps) {
  const layerSig = useSignal(props.layer);
  const featureSig = useSignal(props.feature);
  const basemapSig = useSignal(props.basemap);
  const modeSig = useSignal(props.mode ?? 'layer');

  useEffect(() => { layerSig.value = props.layer; }, [props.layer]);
  useEffect(() => { featureSig.value = props.feature; }, [props.feature]);
  useEffect(() => { basemapSig.value = props.basemap; }, [props.basemap]);
  useEffect(() => { modeSig.value = props.mode ?? 'layer'; }, [props.mode]);

  const mapElementRef = useRef<any>(null);
  const mapInstanceRef = useRef<__esri.Map | null>(null);

  const authError = useSignal(false);
  const isSigningIn = useSignal(false);
  const showLegend = useSignal(false);
  const showLayerToggles = useSignal(false);
  const enabledLayerIds = useSignal<Set<string> | null>(null);
  const enabledSublayerIndices = useSignal<Set<number> | null>(null);
  const viewReady = useSignal(false);

  const customLegends = useComputed<CustomLegend[]>(() => {
    const mode = modeSig.value;
    const feature = featureSig.value;
    if (mode === 'feature' && feature) {
      return feature.items
        ?.filter(item => item.showLegend && item.legendUrl)
        .map(item => ({
          name: item.name,
          url: item.legendUrl!,
          description: item.legendDescription
        })) || [];
    }
    return [];
  });

  // Track feature from store to get latest presentation/mutuallyExclusive values
  const storedFeature = useComputed(() => {
    const feature = featureSig.value;
    if (!feature) return null;
    // Find in weatherFeatures or features
    const fromWeather = jsonData.value.weatherFeatures?.find(f => f.id === feature.id || f.name === feature.name);
    if (fromWeather) return fromWeather;
    return jsonData.value.features?.find(f => f.id === feature.id || f.name === feature.name) ?? feature;
  });

  const featureItems = useComputed<FeatureItem[]>(() => {
    const mode = modeSig.value;
    const feature = storedFeature.value;
    if (mode === 'feature' && feature) {
      const items = feature.items || [];
      if (feature.presentation === 'multiple' || items.length > 1) {
        return items;
      }
    }
    return [];
  });

  const layerConfigs = useComputed<LayerConfig[]>(() => {
    const mode = modeSig.value;
    const layer = layerSig.value;
    const feature = storedFeature.value;
    const basemap = basemapSig.value;

    if (mode === 'layer' && layer) {
      const enabled = enabledSublayerIndices.value;
      if (enabled && enabled.size === 0) return [];
      const storedLayer = jsonData.value.layers.find(l => l.id === layer.id);
      const layersToUse = storedLayer ? storedLayer.layers : layer.layers;
      return layersToUse.filter((_, idx) => enabled === null || enabled.has(idx));
    }

    if (mode === 'feature' && feature) {
      const enabled = enabledLayerIds.value;
      if (enabled && enabled.size === 0) return [];

      const layerIds: string[] = [];
      feature.items?.forEach(item => {
        item.layersIds?.forEach(layerId => {
          if (enabled === null || enabled.has(layerId)) {
            if (!layerIds.includes(layerId)) {
              layerIds.push(layerId);
            }
          }
        });
      });

      const configs: LayerConfig[] = [];
      layerIds.forEach(layerId => {
        const layerEntry = jsonData.value.layers.find(l => l.id === layerId);
        if (layerEntry) {
          configs.push(...layerEntry.layers);
        }
      });
      return configs;
    }

    if (mode === 'basemap' && basemap) {
      const enabled = enabledSublayerIndices.value;
      const storedBasemap = jsonData.value.baseMaps?.find(b => b.id === basemap.id) || basemap;
      const allLayers = [...storedBasemap.baseLayers, ...storedBasemap.referenceLayers];

      if (enabled && enabled.size === 0) return [];
      return allLayers
        .filter((_, idx) => enabled === null || enabled.has(idx))
        .map(layer => layer as LayerConfig);
    }

    return [];
  });

  const displayName = useComputed(() => {
    const mode = modeSig.value;
    if (mode === 'layer') return layerSig.value?.id || '';
    if (mode === 'feature') return featureSig.value?.name || featureSig.value?.id || 'Feature';
    if (mode === 'basemap') return basemapSig.value?.name || basemapSig.value?.id || 'Basemap';
    return '';
  });

  const hasContent = useComputed(() => {
    const mode = modeSig.value;
    return (mode === 'layer' && !!layerSig.value) ||
           (mode === 'feature' && !!featureSig.value) ||
           (mode === 'basemap' && !!basemapSig.value);
  });

  // Selection reset effects - track feature ID, presentation, and mutuallyExclusive changes
  const lastFeatureStateRef = useRef<{ id: string | null; presentation: string | null; mutuallyExclusive: boolean | null }>({
    id: null,
    presentation: null,
    mutuallyExclusive: null
  });

  useEffect(() => {
    const feature = storedFeature.value;
    if (modeSig.value === 'feature' && feature) {
      const featureId = feature.id || feature.name || null;
      const presentation = feature.presentation || null;
      const mutuallyExclusive = feature.mutuallyExclusive ?? false;

      const lastState = lastFeatureStateRef.current;
      const hasChanged = featureId !== lastState.id ||
                         presentation !== lastState.presentation ||
                         mutuallyExclusive !== lastState.mutuallyExclusive;

      if (hasChanged) {
        lastFeatureStateRef.current = { id: featureId, presentation, mutuallyExclusive };

        if (mutuallyExclusive && feature.items && feature.items.length > 0) {
          const firstItemLayerIds = new Set<string>();
          feature.items[0].layersIds?.forEach(id => firstItemLayerIds.add(id));
          enabledLayerIds.value = firstItemLayerIds;
        } else {
          enabledLayerIds.value = null;
        }
      }
    } else {
      lastFeatureStateRef.current = { id: null, presentation: null, mutuallyExclusive: null };
    }
  }, [storedFeature.value, modeSig.value]);

  const lastIdRef = useRef<string | null>(null);
  useEffect(() => {
    const mode = modeSig.value;
    const id = mode === 'layer' ? layerSig.value?.id : (mode === 'basemap' ? basemapSig.value?.id : null);
    if (id && id !== lastIdRef.current) {
      lastIdRef.current = id;
      enabledSublayerIndices.value = null;
    }
  }, [layerSig.value, basemapSig.value, modeSig.value]);

  // Map layer management hook
  const { isLoading, loadedLayerCount, hasTimeAwareLayers, error, cleanup } = useMapLayers({
    layerConfigs,
    mapInstance: mapInstanceRef,
    viewReady
  });

  // Basemap management hook
  useBasemap({
    mapInstance: mapInstanceRef,
    viewReady
  });

  // ArcGIS initialization
  useEffect(() => {
    const initArcGIS = async () => {
      const creds = arcgisCredentials.value || {};
      if (!arcgisState.value.initialized) {
        try {
          await initializeArcGIS(creds);
        } catch (e) {
          console.error('Failed to initialize ArcGIS:', e);
        }
      }
    };
    initArcGIS();
  }, []);

  const handleViewReady = useCallback((event: any) => {
    const mapElement = event.target;
    if (mapElement?.map) {
      if (mapInstanceRef.current !== mapElement.map) {
        cleanup();
      }
      mapInstanceRef.current = mapElement.map;
      viewReady.value = true;
    }
  }, [cleanup]);

  // Store handleViewReady in a ref to avoid re-adding event listeners
  const handleViewReadyRef = useRef(handleViewReady);
  handleViewReadyRef.current = handleViewReady;

  useEffect(() => {
    const mapElement = mapElementRef.current;
    if (!mapElement) return;

    const stableHandler = (event: any) => handleViewReadyRef.current(event);
    mapElement.addEventListener('arcgisViewReadyChange', stableHandler);

    return () => {
      mapElement.removeEventListener('arcgisViewReadyChange', stableHandler);
      cleanup();
      mapInstanceRef.current = null;
      viewReady.value = false;
    };
  }, []);

  const handleSignIn = async () => {
    isSigningIn.value = true;
    try {
      await signInWithOAuth();
      authError.value = false;
    } catch (e) {
      console.error('Sign-in failed:', e);
    } finally {
      isSigningIn.value = false;
    }
  };

  const legendAllowed = useComputed(() =>
    modeSig.value === 'layer' || (modeSig.value === 'feature' && customLegends.value.length > 0)
  );

  useEffect(() => {
    if (!legendAllowed.value && showLegend.value) {
      showLegend.value = false;
    }
  }, [legendAllowed.value]);

  const showLayerToggleButton = useComputed(() => {
    const mode = modeSig.value;
    const feature = storedFeature.value;
    if (mode === 'layer' && layerSig.value && layerSig.value.layers.length > 0) return true;
    if (mode === 'feature' && (featureItems.value.length > 1 || feature?.mutuallyExclusive)) return true;
    if (mode === 'basemap' && basemapSig.value &&
        (basemapSig.value.baseLayers.length + basemapSig.value.referenceLayers.length) > 0) return true;
    return false;
  });

  if (!hasContent.value) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-slate-900/50">
        <div className="text-slate-500">
          <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-xs">Select a layer or feature to preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 p-2 border-b border-slate-700 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
            modeSig.value === 'layer' ? 'bg-blue-600' : modeSig.value === 'feature' ? 'bg-purple-600' : 'bg-green-600'
          } text-white`}>
            {modeSig.value === 'layer' ? 'Layer' : modeSig.value === 'feature' ? 'Feature' : 'Basemap'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {showLayerToggleButton.value && (
            <calcite-button
              appearance={showLayerToggles.value ? 'solid' : 'outline-fill'}
              scale="s"
              kind={showLayerToggles.value ? 'brand' : 'neutral'}
              onClick={() => showLayerToggles.value = !showLayerToggles.value}
              title="Toggle layer visibility"
            >
              Layers
            </calcite-button>
          )}
          {legendAllowed.value && (
            <calcite-button
              appearance={showLegend.value ? 'solid' : 'outline-fill'}
              scale="s"
              kind={showLegend.value ? 'brand' : 'neutral'}
              onClick={() => showLegend.value = !showLegend.value}
              title="Toggle legend"
            >
              Legend
            </calcite-button>
          )}
          {modeSig.value !== 'basemap' && (
            <BasemapDropdown
              currentBasemap={previewBasemap.value}
              customBasemaps={jsonData.value.baseMaps || []}
              onSelect={setPreviewBasemap}
            />
          )}
        </div>
      </div>

      <div className="flex-1 relative min-h-0" data-calcite-mode="dark">
        {/* CRITICAL: basemap attribute is required for the map to display initially */}
        <arcgis-map
          ref={mapElementRef}
          basemap={DEFAULT_ARCGIS_BASEMAP.id}
          center="10.5,59.9"
          zoom="5"
          style={{ width: '100%', height: '100%' }}
        >
          <arcgis-zoom position="top-left" />
          {hasTimeAwareLayers.value && <arcgis-time-slider position="bottom-left" />}
        </arcgis-map>

        {isLoading.value && (
          <div className="absolute bottom-4 right-4 z-10 pointer-events-none bg-slate-800/80 p-2 rounded-full shadow-lg">
            <calcite-loader scale="s" inline></calcite-loader>
          </div>
        )}

        {authError.value && !arcgisState.value.portalAuthenticated && isOAuthConfigured() && (
          <div className="absolute bottom-2 left-2 right-2 p-3 bg-amber-900/95 text-amber-100 text-sm rounded-lg z-20 border border-amber-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium mb-0.5">Portal authentication required</div>
                <div className="text-xs text-amber-200/80">
                  Sign in to access portal items from {PORTAL_URL}
                </div>
              </div>
              <button
                className="btn primary small whitespace-nowrap"
                onClick={handleSignIn}
                disabled={isSigningIn.value}
              >
                {isSigningIn.value ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </div>
        )}

        {error.value && !(authError.value && !arcgisState.value.portalAuthenticated) && (
          <div className="absolute bottom-2 left-2 right-2 z-10">
            <calcite-notice
              kind="danger"
              icon="exclamation-mark-triangle"
              closable
              open
              onCalciteNoticeClose={() => { error.value = null; }}
            >
              <div slot="title">Error loading layers</div>
              <div slot="message" className="text-xs max-h-24 overflow-auto whitespace-pre-wrap">
                {error.value}
              </div>
            </calcite-notice>
          </div>
        )}

        {showLegend.value && legendAllowed.value && (
          <LegendPanel
            mode={modeSig.value}
            customLegends={customLegends.value}
            mapElementRef={mapElementRef}
            viewReady={viewReady.value}
            onClose={() => showLegend.value = false}
          />
        )}

        {showLayerToggles.value && (
          <LayerVisibilityPanel
            mode={modeSig.value}
            layer={layerSig.value}
            feature={storedFeature.value}
            basemap={basemapSig.value}
            featureItems={featureItems.value}
            enabledSublayerIndices={enabledSublayerIndices}
            enabledLayerIds={enabledLayerIds}
            onClose={() => showLayerToggles.value = false}
          />
        )}
      </div>

      <div className="p-2 border-t border-slate-700 text-xs flex-shrink-0 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <span className="truncate max-w-[50%] text-slate-500">
            {displayName.value} ({layerConfigs.value.length} layers)
          </span>
          <div className="flex items-center gap-2">
            {loadedLayerCount.value > 0 && <span className="text-green-400">{loadedLayerCount.value} loaded</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
