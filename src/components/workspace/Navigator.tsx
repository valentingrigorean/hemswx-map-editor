import { useComputed, useSignal } from '@preact/signals';
import { jsonData } from '../../lib/jsonStore';
import { MapFeature, TreeSelection } from '../../lib/types';
import { isCustomLogicLayer, isNonTranslatableKey } from '../../lib/settings';
import { SUPPORTED_LANGUAGES } from '../../lib/intl';
import { getLayerUsage } from '../../lib/utils';
import CollapsibleSection from '../ui/CollapsibleSection';
import TreeItem from '../ui/TreeItem';

interface NavigatorProps {
  selection: TreeSelection;
  onSelectFeature: (featureType: 'weatherFeatures' | 'features', index: number, itemIndex?: number) => void;
  onSelectLayer: (index: number) => void;
  onNewFeature: (featureType: 'weatherFeatures' | 'features') => void;
  onNewItem: (featureType: 'weatherFeatures' | 'features', index: number) => void;
}

export default function Navigator({
  selection,
  onSelectFeature,
  onSelectLayer,
  onNewFeature,
  onNewItem
}: NavigatorProps) {
  const searchTerm = useSignal('');
  
  const weatherFeatures = useComputed(() => {
    const list = jsonData.value.weatherFeatures || [];
    if (!searchTerm.value.trim()) return list;
    return list.filter(f => 
      f.id?.toLowerCase().includes(searchTerm.value.toLowerCase()) || 
      f.name?.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      f.items?.some(i => i.id?.toLowerCase().includes(searchTerm.value.toLowerCase()) || i.name?.toLowerCase().includes(searchTerm.value.toLowerCase()))
    );
  });

  const generalFeatures = useComputed(() => {
    const list = jsonData.value.features || [];
    if (!searchTerm.value.trim()) return list;
    return list.filter(f => 
      f.id?.toLowerCase().includes(searchTerm.value.toLowerCase()) || 
      f.name?.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      f.items?.some(i => i.id?.toLowerCase().includes(searchTerm.value.toLowerCase()) || i.name?.toLowerCase().includes(searchTerm.value.toLowerCase()))
    );
  });

  const layers = useComputed(() => jsonData.value.layers || []);

  const getFeatureDisplayName = (feature: MapFeature) => {
    if (feature.name?.trim()) return feature.name;
    if (feature.presentation === 'single' && feature.items?.[0]?.name?.trim()) {
      return feature.items[0].name;
    }
    return feature.id || 'Unnamed Feature Group';
  };

  const getFeatureStatus = (feature: MapFeature): { text: string; color: string } => {
    // 1. Check for missing layers
    const allLayerIds = new Set(jsonData.value.layers?.map(l => l.id) || []);
    const hasMissingLayers = feature.items?.some(item => 
      !item.layersIds || item.layersIds.length === 0 || 
      item.layersIds.some(id => !allLayerIds.has(id))
    );

    if (hasMissingLayers) {
      return { text: '⚠️', color: 'text-amber-400' };
    }

    // 2. Check Translation Status
    const keys: string[] = [];
    if (feature.id?.trim()) keys.push(feature.id);
    feature.items?.forEach(item => {
      if (item.id?.trim()) keys.push(item.id);
    });

    if (keys.length === 0) return { text: '✅', color: 'text-green-400' };

    // Check if all keys are non-translatable (Locked)
    const lockedKeys = keys.filter(k => isNonTranslatableKey(k));
    const translatableKeys = keys.filter(k => !isNonTranslatableKey(k));

    if (translatableKeys.length === 0) {
      return { text: '🔒', color: 'text-slate-400' };
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
    
    if (percent === 100) {
      return { text: '✅', color: 'text-green-400' };
    }
    
    // Red dot if incomplete (or percentage)
    // Requirement: "Red Dot: Translation is enabled but languages are missing."
    // "Green/100%: Translation is enabled and all 4 languages are filled."
    
    return { text: '🔴', color: 'text-red-400' };
  };

  const renderFeatureNode = (feature: MapFeature, index: number, type: 'weatherFeatures' | 'features') => {
    // Correct index lookup if filtered
    // We need to find the actual index in the original data for selection
    const originalIndex = type === 'weatherFeatures' 
      ? (jsonData.value.weatherFeatures || []).findIndex(f => f === feature)
      : (jsonData.value.features || []).findIndex(f => f === feature);

    if (originalIndex === -1) return null;

    const isSelected = selection?.type === 'feature' &&
      selection.featureType === type &&
      selection.index === originalIndex &&
      selection.itemIndex === undefined;

    const hasChildSelected = feature.items?.some((_, itemIndex) => 
      selection?.type === 'feature' &&
      selection.featureType === type &&
      selection.index === originalIndex &&
      selection.itemIndex === itemIndex
    );

    const status = getFeatureStatus(feature);
    
    const isRadio = feature.presentation === 'single' || (feature.presentation === 'multiple' && feature.mutuallyExclusive);

    return (
      <TreeItem
        key={`${type}-${originalIndex}`}
        label={getFeatureDisplayName(feature)}
        sublabel={feature.id}
        isSelected={isSelected}
        shouldExpand={hasChildSelected}
        onClick={() => onSelectFeature(type, originalIndex)}
        actions={
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-600 text-slate-400 hover:text-white mr-1"
            onClick={(e) => {
              e.stopPropagation();
              onNewItem(type, originalIndex);
            }}
            title="Add Layer Item"
          >
            +
          </button>
        }
        badges={[status]}
      >
        {feature.items?.map((item, itemIndex) => {
          const isItemSelected = selection?.type === 'feature' &&
            selection.featureType === type &&
            selection.index === originalIndex &&
            selection.itemIndex === itemIndex;

          return (
            <div
              key={itemIndex}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all ml-2 border-l border-slate-700 ${
                isItemSelected
                  ? 'bg-blue-600/20 text-blue-200 border-blue-500'
                  : 'hover:bg-slate-700/50 text-slate-400 border-slate-700'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectFeature(type, originalIndex, itemIndex);
              }}
            >
              <div className={`w-3.5 h-3.5 border border-slate-500 flex items-center justify-center flex-shrink-0 ${isRadio ? 'rounded-full' : 'rounded-sm'}`}>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{item.name || item.id || '(unnamed item)'}</div>
              </div>
            </div>
          );
        })}
        {feature.items?.length === 0 && (
          <div className="text-xs text-slate-500 italic ml-4 py-1">No items</div>
        )}
      </TreeItem>
    );
  };

  return (
    <div className="w-full h-full bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-2 p-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-300">Feature Manager</h2>
          <div className="flex gap-1">
            <button
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400"
              onClick={() => onNewFeature('weatherFeatures')}
              title="New Weather Feature"
            >
              +
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <input 
          type="text" 
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
          placeholder="Search features..."
          value={searchTerm.value}
          onInput={(e) => searchTerm.value = (e.target as HTMLInputElement).value}
        />
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-4">
        {/* Weather Features Tree */}
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2 flex justify-between items-center">
            <span>Weather Features</span>
            <span className="text-slate-600">{weatherFeatures.value.length}</span>
          </div>
          <div className="space-y-0.5">
            {weatherFeatures.value.map((f, i) => renderFeatureNode(f, i, 'weatherFeatures'))}
          </div>
        </div>

        {/* General Features Tree */}
        <div>
           <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2 flex justify-between items-center">
            <span>General Features</span>
            <button 
              className="text-slate-500 hover:text-white"
              onClick={() => onNewFeature('features')}
              title="Add General Feature"
            >
              +
            </button>
          </div>
          <div className="space-y-0.5">
            {generalFeatures.value.map((f, i) => renderFeatureNode(f, i, 'features'))}
          </div>
        </div>

        {/* Layers Section */}
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2 flex justify-between items-center">
            <span>Raw Layers</span>
            <span className="text-slate-600">{layers.value.length}</span>
          </div>
          
          {layers.value.length === 0 ? (
            <div className="text-slate-500 text-xs text-center py-2">No layers defined</div>
          ) : (
            <div className="space-y-0.5">
              {layers.value.map((layer, index) => {
                if (searchTerm.value && !layer.id.toLowerCase().includes(searchTerm.value.toLowerCase())) {
                   return null;
                }

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
                      ...(usage.length > 0 ? [{ text: `${usage.length}`, color: 'bg-slate-700' }] : []),
                      ...(usage.length === 0 && !isReferenced ? [{ text: '!', color: 'bg-orange-900/50 text-orange-200' }] : []),
                    ]}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
