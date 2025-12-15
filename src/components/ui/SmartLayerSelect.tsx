import { useSignal, useComputed } from '@preact/signals';
import { useRef, useEffect } from 'preact/hooks';
import { jsonData } from '../../lib/jsonStore';

interface SmartLayerSelectProps {
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  excludeIds?: string[];
  className?: string;
}

export default function SmartLayerSelect({
  value,
  onChange,
  placeholder = 'Select a layer...',
  excludeIds = [],
  className = ''
}: SmartLayerSelectProps) {
  const isOpen = useSignal(false);
  const search = useSignal('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        isOpen.value = false;
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const layers = useComputed(() => jsonData.value.layers || []);
  
  const filteredLayers = useComputed(() => {
    const term = search.value.toLowerCase().trim();
    return layers.value.filter(layer => {
      if (excludeIds.includes(layer.id)) return false;
      if (!term) return true;
      return (
        layer.id.toLowerCase().includes(term) ||
        jsonData.value.intl?.en?.[layer.id]?.toLowerCase().includes(term)
      );
    });
  });

  const selectedLayer = useComputed(() => 
    value ? layers.value.find(l => l.id === value) : null
  );

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div
        className="form-input flex items-center justify-between cursor-pointer bg-slate-800 border border-slate-700 hover:border-slate-600"
        onClick={() => {
          isOpen.value = !isOpen.value;
          if (isOpen.value) {
             // Reset search when opening
             search.value = '';
          }
        }}
      >
        <span className={selectedLayer.value ? 'text-slate-200' : 'text-slate-500'}>
          {selectedLayer.value ? selectedLayer.value.id : placeholder}
        </span>
        <span className="text-slate-500 text-xs">▼</span>
      </div>

      {isOpen.value && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-700">
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              placeholder="Search layers..."
              value={search.value}
              onInput={(e) => search.value = (e.target as HTMLInputElement).value}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredLayers.value.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500 text-center">No layers found</div>
            ) : (
              filteredLayers.value.map(layer => (
                <div
                  key={layer.id}
                  className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 cursor-pointer rounded flex items-center justify-between group"
                  onClick={() => {
                    onChange(layer.id);
                    isOpen.value = false;
                  }}
                >
                  <span className="font-mono text-blue-300">{layer.id}</span>
                  <span className="text-xs text-slate-500 group-hover:text-slate-400">
                    {jsonData.value.intl?.en?.[layer.id] || ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
