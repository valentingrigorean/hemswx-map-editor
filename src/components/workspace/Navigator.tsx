import { useComputed } from '@preact/signals';
import { jsonData } from '../../lib/jsonStore';
import { MapFeature } from '../../lib/types';
import { isCustomLogicLayer, isNonTranslatableKey } from '../../lib/settings';
import { SUPPORTED_LANGUAGES } from '../../lib/intl';
import { getLayerUsage } from '../../lib/utils';
import CollapsibleSection from '../ui/CollapsibleSection';
import TreeItem from '../ui/TreeItem';

export type TreeSelection =
  | { type: 'feature'; featureType: 'weatherFeatures' | 'features'; index: number }
  | { type: 'layer'; index: number }
  | null;

interface NavigatorProps {
  selection: TreeSelection;
  onSelectFeature: (featureType: 'weatherFeatures' | 'features', index: number) => void;
  onSelectLayer: (index: number) => void;
  onNewFeature: (featureType: 'weatherFeatures' | 'features') => void;
}

export default function Navigator({
  selection,
  onSelectFeature,
  onSelectLayer,
  onNewFeature
}: NavigatorProps) {
  const weatherFeatures = useComputed(() => jsonData.value.weatherFeatures || []);
  const generalFeatures = useComputed(() => jsonData.value.features || []);
  const layers = useComputed(() => jsonData.value.layers || []);

  const getFeatureDisplayName = (feature: MapFeature) => {
    if (feature.name?.trim()) return feature.name;
    if (feature.presentation === 'single' && feature.items?.[0]?.name?.trim()) {
      return feature.items[0].name;
    }
    return feature.id || 'Unnamed';
  };

  const getTranslationStatus = (feature: MapFeature): { percent: number; allLocked: boolean } => {
    const keys: string[] = [];
    if (feature.id?.trim()) keys.push(feature.id);
    feature.items?.forEach(item => {
      if (item.id?.trim()) keys.push(item.id);
    });

    if (keys.length === 0) return { percent: 100, allLocked: false };

    // Check if all keys are non-translatable
    const lockedKeys = keys.filter(k => isNonTranslatableKey(k));
    const translatableKeys = keys.filter(k => !isNonTranslatableKey(k));

    if (translatableKeys.length === 0) {
      // All keys are locked
      return { percent: 100, allLocked: true };
    }

    let completed = 0;
    let total = 0;
    translatableKeys.forEach(key => {
      SUPPORTED_LANGUAGES.forEach(lang => {
        total++;
        if (jsonData.value.intl?.[lang]?.[key]?.trim()) completed++;
      });
    });

    const percent = total > 0 ? Math.round((completed / total) * 100) : 100;
    return { percent, allLocked: false };
  };

  return (
    <div className="w-full h-full bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700">
        <h2 className="text-sm font-medium text-slate-300">Navigator</h2>
        <button
          className="btn tiny primary"
          onClick={() => onNewFeature('weatherFeatures')}
          title="New Weather Feature"
        >
          + Feature
        </button>
      </div>

      <div className="flex-1 overflow-auto space-y-1">
        {/* Weather Features */}
        <CollapsibleSection
          title="Weather Features"
          badge={weatherFeatures.value.length}
          badgeColor="bg-blue-600"
          actions={
            <button
              className="btn tiny ghost"
              onClick={(e) => { e.stopPropagation(); onNewFeature('weatherFeatures'); }}
              title="Add weather feature"
            >
              +
            </button>
          }
        >
          {weatherFeatures.value.length === 0 ? (
            <div className="text-slate-500 text-xs text-center py-2">No weather features</div>
          ) : (
            <div className="space-y-0.5">
              {weatherFeatures.value.map((feature, index) => {
                const isSelected = selection?.type === 'feature' &&
                  selection.featureType === 'weatherFeatures' &&
                  selection.index === index;
                const { percent, allLocked } = getTranslationStatus(feature);

                return (
                  <TreeItem
                    key={`weather-${index}`}
                    label={getFeatureDisplayName(feature)}
                    sublabel={`${feature.items?.length || 0} item(s) • ${feature.presentation}`}
                    isSelected={isSelected}
                    onClick={() => onSelectFeature('weatherFeatures', index)}
                    badges={[
                      allLocked ? {
                        text: '🔒',
                        color: 'bg-slate-600'
                      } : {
                        text: `${percent}%`,
                        color: percent === 100 ? 'bg-green-600' : percent > 50 ? 'bg-yellow-600' : 'bg-red-600'
                      }
                    ]}
                  />
                );
              })}
            </div>
          )}
        </CollapsibleSection>

        {/* General Features */}
        <CollapsibleSection
          title="General Features"
          badge={generalFeatures.value.length}
          badgeColor="bg-purple-600"
          actions={
            <button
              className="btn tiny ghost"
              onClick={(e) => { e.stopPropagation(); onNewFeature('features'); }}
              title="Add general feature"
            >
              +
            </button>
          }
        >
          {generalFeatures.value.length === 0 ? (
            <div className="text-slate-500 text-xs text-center py-2">No general features</div>
          ) : (
            <div className="space-y-0.5">
              {generalFeatures.value.map((feature, index) => {
                const isSelected = selection?.type === 'feature' &&
                  selection.featureType === 'features' &&
                  selection.index === index;
                const { percent, allLocked } = getTranslationStatus(feature);

                return (
                  <TreeItem
                    key={`general-${index}`}
                    label={getFeatureDisplayName(feature)}
                    sublabel={`${feature.items?.length || 0} item(s) • ${feature.presentation}`}
                    isSelected={isSelected}
                    onClick={() => onSelectFeature('features', index)}
                    badges={[
                      allLocked ? {
                        text: '🔒',
                        color: 'bg-slate-600'
                      } : {
                        text: `${percent}%`,
                        color: percent === 100 ? 'bg-green-600' : percent > 50 ? 'bg-yellow-600' : 'bg-red-600'
                      }
                    ]}
                  />
                );
              })}
            </div>
          )}
        </CollapsibleSection>

        {/* Layers */}
        <CollapsibleSection
          title="Layers"
          badge={layers.value.length}
          badgeColor="bg-emerald-600"
        >
          {layers.value.length === 0 ? (
            <div className="text-slate-500 text-xs text-center py-2">No layers defined</div>
          ) : (
            <div className="space-y-0.5">
              {layers.value.map((layer, index) => {
                const isSelected = selection?.type === 'layer' && selection.index === index;
                const usage = getLayerUsage(jsonData.value, layer.id);
                const isReferenced = isCustomLogicLayer(layer.id);

                return (
                  <TreeItem
                    key={`layer-${index}`}
                    label={layer.id}
                    sublabel={`${layer.layers?.length || 0} sublayer(s)`}
                    isSelected={isSelected}
                    onClick={() => onSelectLayer(index)}
                    badges={[
                      ...(usage.length > 0 ? [{ text: `${usage.length} ref`, color: 'bg-slate-600' }] : []),
                      ...(usage.length === 0 && !isReferenced ? [{ text: 'unused', color: 'bg-orange-600' }] : []),
                      ...(isReferenced ? [{ text: 'code', color: 'bg-blue-600' }] : [])
                    ]}
                  />
                );
              })}
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}
