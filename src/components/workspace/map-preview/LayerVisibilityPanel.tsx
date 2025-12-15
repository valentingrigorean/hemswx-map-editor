import { useEffect, useRef } from 'preact/hooks';
import type { Signal } from '@preact/signals';
import type { LayerEntry, MapFeature, BaseMapEntity, FeatureItem } from '../../../lib/types';
import type { PreviewMode } from './types';

interface LayerVisibilityPanelProps {
  mode: PreviewMode;
  layer: LayerEntry | null | undefined;
  feature: MapFeature | null | undefined;
  basemap: BaseMapEntity | null | undefined;
  featureItems: FeatureItem[];
  enabledSublayerIndices: Signal<Set<number> | null>;
  enabledLayerIds: Signal<Set<string> | null>;
  onClose: () => void;
}

export function LayerVisibilityPanel({
  mode,
  layer,
  feature,
  basemap,
  featureItems,
  enabledSublayerIndices,
  enabledLayerIds,
  onClose
}: LayerVisibilityPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLElement>(null);

  const handleSublayerToggle = (idx: number, totalCount: number) => {
    if (enabledSublayerIndices.value === null) {
      const newSet = new Set(Array.from({ length: totalCount }, (_, i) => i));
      newSet.delete(idx);
      enabledSublayerIndices.value = newSet;
    } else {
      const current = new Set(enabledSublayerIndices.value);
      if (current.has(idx)) current.delete(idx);
      else current.add(idx);
      enabledSublayerIndices.value = current;
    }
  };

  const handleFeatureItemToggle = (item: FeatureItem, isMutuallyExclusive: boolean) => {
    const ids = item.layersIds || [];
    if (ids.length === 0) return;

    if (isMutuallyExclusive) {
      enabledLayerIds.value = new Set(ids);
    } else {
      const current = enabledLayerIds.value;

      if (current === null) {
        const allLayerIds = new Set<string>();
        featureItems.forEach(fi => fi.layersIds?.forEach(id => allLayerIds.add(id)));
        ids.forEach(id => allLayerIds.delete(id));
        enabledLayerIds.value = allLayerIds;
      } else {
        const newSet = new Set(current);
        const hasAll = ids.every(id => newSet.has(id));

        if (hasAll) {
          ids.forEach(id => newSet.delete(id));
        } else {
          ids.forEach(id => newSet.add(id));
        }
        enabledLayerIds.value = newSet;
      }
    }
  };

  const isFeatureItemSelected = (item: FeatureItem): boolean => {
    const ids = item.layersIds || [];
    if (ids.length === 0) return false;
    const enabled = enabledLayerIds.value;
    if (enabled === null) return true;
    return ids.some(id => enabled.has(id));
  };

  const isMutuallyExclusive = feature?.mutuallyExclusive ?? false;

  // Handle panel close event
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const handleClose = (e: Event) => {
      e.stopPropagation();
      onClose();
    };

    panel.addEventListener('calcitePanelClose', handleClose);
    return () => panel.removeEventListener('calcitePanelClose', handleClose);
  }, [onClose]);

  // Handle list item select events
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const handleSelect = (e: Event) => {
      const target = e.target as HTMLElement;
      const dataIdx = target.getAttribute('data-idx');
      const dataType = target.getAttribute('data-type');
      const dataTotalCount = target.getAttribute('data-total-count');

      if (dataType === 'sublayer' && dataIdx !== null && dataTotalCount !== null) {
        handleSublayerToggle(parseInt(dataIdx, 10), parseInt(dataTotalCount, 10));
      } else if (dataType === 'feature-item' && dataIdx !== null) {
        const item = featureItems[parseInt(dataIdx, 10)];
        if (item) {
          handleFeatureItemToggle(item, isMutuallyExclusive);
        }
      }
    };

    list.addEventListener('calciteListItemSelect', handleSelect);
    return () => list.removeEventListener('calciteListItemSelect', handleSelect);
  }, [featureItems, isMutuallyExclusive, enabledSublayerIndices, enabledLayerIds]);

  const sublayerCount = mode === 'layer' ? (layer?.layers.length || 0) :
    mode === 'basemap' && basemap ? (basemap.baseLayers.length + basemap.referenceLayers.length) : 0;

  return (
    <calcite-panel
      ref={panelRef}
      heading="Visibility"
      closable
      style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        width: '280px',
        maxHeight: 'calc(100% - 16px)',
        zIndex: 20
      }}
    >
      <calcite-list ref={listRef} selection-mode={isMutuallyExclusive ? 'single' : 'multiple'}>
        {mode === 'layer' && layer?.layers.map((sublayer, idx) => (
          <calcite-list-item
            key={idx}
            data-idx={idx}
            data-type="sublayer"
            data-total-count={sublayerCount}
            label={`#${idx + 1} ${sublayer.type}`}
            description={sublayer.source}
            selected={enabledSublayerIndices.value === null || enabledSublayerIndices.value?.has(idx)}
          />
        ))}
        {mode === 'feature' && featureItems.map((item, idx) => (
          <calcite-list-item
            key={idx}
            data-idx={idx}
            data-type="feature-item"
            label={item.name || `Item ${idx}`}
            selected={isFeatureItemSelected(item)}
          />
        ))}
        {mode === 'basemap' && basemap && (
          <>
            {basemap.baseLayers.map((bl, idx) => (
              <calcite-list-item
                key={`base-${idx}`}
                data-idx={idx}
                data-type="sublayer"
                data-total-count={sublayerCount}
                label={`Base #${idx + 1} ${bl.type}`}
                description={bl.source}
                selected={enabledSublayerIndices.value === null || enabledSublayerIndices.value?.has(idx)}
              />
            ))}
            {basemap.referenceLayers.map((rl, idx) => {
              const actualIdx = basemap.baseLayers.length + idx;
              return (
                <calcite-list-item
                  key={`ref-${idx}`}
                  data-idx={actualIdx}
                  data-type="sublayer"
                  data-total-count={sublayerCount}
                  label={`Ref #${idx + 1} ${rl.type}`}
                  description={rl.source}
                  selected={enabledSublayerIndices.value === null || enabledSublayerIndices.value?.has(actualIdx)}
                />
              );
            })}
          </>
        )}
      </calcite-list>
    </calcite-panel>
  );
}
