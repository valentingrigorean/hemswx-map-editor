import { useSignal, useComputed } from '@preact/signals';
import { LayerEntry, MapLayersData } from '../../lib/types';
import { getLayerUsage } from '../../lib/utils';

interface LayerPickerProps {
  layers: LayerEntry[];
  excludeIds?: string[];
  data: MapLayersData;
  onSelect: (layerId: string) => void;
  onCreateNew: () => void;
}

export default function LayerPicker({
  layers,
  excludeIds = [],
  data,
  onSelect,
  onCreateNew
}: LayerPickerProps) {
  const isOpen = useSignal(false);
  const search = useSignal('');

  const availableLayers = useComputed(() => {
    return layers.filter(l => !excludeIds.includes(l.id));
  });

  const filteredLayers = useComputed(() => {
    const term = search.value.toLowerCase().trim();
    if (!term) return availableLayers.value;

    return availableLayers.value.filter(layer => {
      const idMatch = layer.id.toLowerCase().includes(term);
      const intlMatch = getIntlName(layer.id)?.toLowerCase().includes(term);
      const sourceMatch = layer.layers?.some(sub =>
        sub.source?.toLowerCase().includes(term) ||
        sub.type?.toLowerCase().includes(term)
      );
      return idMatch || intlMatch || sourceMatch;
    });
  });

  const getIntlName = (layerId: string): string | null => {
    return data.intl?.en?.[layerId] || null;
  };

  const getLayerTypes = (layer: LayerEntry): string => {
    if (!layer.layers || layer.layers.length === 0) return 'No sublayers';
    const types = [...new Set(layer.layers.map(l => l.type.toUpperCase()))];
    return types.join(', ');
  };

  const getLayerSource = (layer: LayerEntry): string | null => {
    if (!layer.layers || layer.layers.length === 0) return null;
    return layer.layers[0].source || null;
  };

  const getUsageInfo = (layerId: string) => {
    return getLayerUsage(data, layerId);
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn small flex-1"
          onClick={() => isOpen.value = true}
          disabled={availableLayers.value.length === 0}
        >
          {availableLayers.value.length === 0
            ? 'No layers available'
            : `Pick from ${availableLayers.value.length} layer(s)...`}
        </button>
        <button
          type="button"
          className="btn small primary"
          onClick={onCreateNew}
        >
          + New Layer
        </button>
      </div>

      {/* Modal */}
      {isOpen.value && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => isOpen.value = false}>
          <div
            className="bg-slate-800 border border-slate-600 rounded-xl w-[600px] max-w-[90vw] max-h-[80vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-white">Select Layer</h3>
                <button
                  className="text-slate-400 hover:text-white text-xl leading-none"
                  onClick={() => isOpen.value = false}
                >
                  ×
                </button>
              </div>
              <input
                type="text"
                className="form-input w-full"
                placeholder="Search by ID, name, type, or source..."
                value={search.value}
                onInput={(e) => search.value = (e.target as HTMLInputElement).value}
                autoFocus
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-2">
              {filteredLayers.value.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  {search.value ? `No layers match "${search.value}"` : 'No layers available'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredLayers.value.map(layer => {
                    const intlName = getIntlName(layer.id);
                    const source = getLayerSource(layer);
                    const usage = getUsageInfo(layer.id);

                    return (
                      <button
                        key={layer.id}
                        type="button"
                        className="w-full px-3 py-2.5 text-left hover:bg-slate-700 rounded-lg transition-colors"
                        onClick={() => {
                          onSelect(layer.id);
                          isOpen.value = false;
                          search.value = '';
                        }}
                      >
                        {/* Row 1: ID and Type */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-sm text-blue-400 truncate">
                            {layer.id}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 bg-slate-600 rounded text-slate-300 flex-shrink-0">
                            {getLayerTypes(layer)}
                          </span>
                        </div>

                        {/* Row 2: Intl Name */}
                        {intlName && (
                          <div className="text-sm text-white mb-1">
                            {intlName}
                          </div>
                        )}

                        {/* Row 3: Source */}
                        {source && (
                          <div className="text-xs text-slate-500 truncate mb-1">
                            {source}
                          </div>
                        )}

                        {/* Row 4: Usage */}
                        <div className="text-xs">
                          {usage.length === 0 ? (
                            <span className="text-orange-400">Not used by any feature</span>
                          ) : (
                            <span className="text-green-400">
                              Used by: {usage.map(u => u.featureName || u.itemName).slice(0, 3).join(', ')}
                              {usage.length > 3 && ` +${usage.length - 3} more`}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {filteredLayers.value.length} of {availableLayers.value.length} layer(s)
              </span>
              <button
                className="btn small primary"
                onClick={() => {
                  isOpen.value = false;
                  onCreateNew();
                }}
              >
                + Create New Layer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
