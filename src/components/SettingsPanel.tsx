import { useComputed } from '@preact/signals';
import { jsonData } from '../lib/jsonStore';
import { settings, toggleCustomLogicLayer, isCustomLogicLayer } from '../lib/settings';

export default function SettingsPanel() {
  const allLayerIds = useComputed(() => {
    return jsonData.value.layers?.map(layer => layer.id).filter(Boolean) || [];
  });

  const customLogicLayers = useComputed(() => settings.value.customLogicLayers);

  return (
    <div className="max-h-[calc(100vh-180px)] overflow-auto">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Application Settings</h3>
        <p className="text-sm text-slate-400 mb-4">
          Configure layers with custom logic that are referenced in your application code.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-3">Referenced Layers</h4>
          <p className="text-sm text-slate-400 mb-3">
            Layers marked as "referenced" are used in your application code (Dart) and should be handled differently during validation.
          </p>
          
          <div className="space-y-3">
            <div className="p-3 bg-slate-700 rounded">
              <div className="text-sm font-medium mb-2">Current Referenced Layers:</div>
              {customLogicLayers.value.size === 0 ? (
                <div className="text-slate-400 text-sm italic">None</div>
              ) : (
                <div className="font-mono text-sm text-blue-300">
                  {Array.from(customLogicLayers.value).join(', ')}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-700 rounded">
              <div className="text-sm font-medium mb-2">Available Layers:</div>
              {allLayerIds.value.length === 0 ? (
                <div className="text-slate-400 text-sm">No layers found. Add some layers first.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allLayerIds.value.map((layerId) => (
                    <button
                      key={layerId}
                      onClick={() => toggleCustomLogicLayer(layerId)}
                      className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                        isCustomLogicLayer(layerId)
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      }`}
                    >
                      {isCustomLogicLayer(layerId) ? '✓ ' : '+ '}{layerId}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 p-3 bg-slate-700 rounded text-sm">
          <h5 className="font-medium mb-2">What does "Referenced" mean?</h5>
          <ul className="text-slate-400 space-y-1 text-xs">
            <li>• Layer is referenced/used in your Dart application code</li>
            <li>• Layer should be handled differently during validation</li>
            <li>• Layer appears with visual indicators throughout the UI</li>
            <li>• Settings are saved locally in your browser</li>
          </ul>
        </div>

        {customLogicLayers.value.size > 0 && (
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded text-sm">
            <h5 className="font-medium mb-2 text-blue-300">Referenced Layers ({customLogicLayers.value.size})</h5>
            <div className="flex flex-wrap gap-1">
              {Array.from(customLogicLayers.value).map((layerId) => (
                <span key={layerId} className="font-mono text-xs bg-blue-600 text-white px-2 py-1 rounded">
                  {layerId}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}