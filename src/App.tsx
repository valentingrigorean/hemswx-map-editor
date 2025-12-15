import { useRef, useEffect } from 'preact/hooks';
import {
  activeTab,
  dataSummary,
  hasJson,
  setStatus,
  jsonData,
  updateJsonData,
  loadLastJsonData
} from './lib/jsonStore';
import JsonEditor from './components/JsonEditor';
import WorkspacePanel from './components/WorkspacePanel';
import BaseMapsPanel from './components/BaseMapsPanel';

import SettingsPanel from './components/SettingsPanel';
import EmptyState from './components/EmptyState';
import Sidebar from './components/Sidebar';
import '@arcgis/core/assets/esri/themes/dark/main.css';
import './styles/globals.css';
import { validateJSON } from './lib/parse';
import { downloadBlob, extractMapLayersData } from './lib/utils';

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-load last session on app start
  useEffect(() => {
    if (!hasJson.value) {
      loadLastJsonData();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if Cmd/Ctrl is pressed
      if (!(e.metaKey || e.ctrlKey)) return;

      // Prevent Cmd+S from showing browser save dialog
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const handleLoadFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 text-slate-200">
      {/* Hidden file input */}
      <input 
        ref={fileInputRef as any}
        type="file" 
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const text = event.target?.result as string;
              if (text) {
                try {
                  const rawData = JSON.parse(text);
                  const data = extractMapLayersData(rawData);
                  updateJsonData(data);
                  const isWrapped = rawData.map_layers !== undefined;
                  setStatus(`✅ JSON file loaded successfully${isWrapped ? ' (extracted from map_layers)' : ''}`);
                } catch (error) {
                  setStatus(`❌ Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`);
                }
              }
            };
            reader.readAsText(file);
          }
        }}
      />

      {/* Sidebar - only show when we have data */}
      {hasJson.value && <Sidebar />}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        {hasJson.value && (
          <header
            className="flex gap-3 items-center p-3 border-b border-slate-700 bg-slate-900/90 backdrop-blur z-[5] flex-shrink-0"
          >
            <h1 className="text-base m-0 mr-2 opacity-95">Map Layers JSON Editor</h1>
            <button className="btn small" onClick={handleLoadFile}>
              Open JSON…
            </button>
            <div className="ml-auto">
              {hasJson.value && <span className="text-slate-500 text-xs">{dataSummary.value}</span>}
            </div>
          </header>
        )}

        {/* Content Views */}
        <div className="flex-1 overflow-hidden relative">
          {!hasJson.value ? (
            <div className="p-6 h-full overflow-auto">
              <EmptyState onOpenClick={handleLoadFile} />
            </div>
          ) : (
            <>
              {/* Unified Workspace */}
              {activeTab.value === 'workspace' && (
                <div className="h-full w-full">
                  <WorkspacePanel />
                </div>
              )}

              {/* Basemaps Panel */}
              {activeTab.value === 'basemaps' && (
                <div className="h-full w-full p-4 overflow-auto">
                  <BaseMapsPanel />
                </div>
              )}

              {/* JSON Editor */}
              {activeTab.value === 'json' && (
                <div className="h-full w-full flex flex-col p-4">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 min-h-0">
                      <JsonEditor
                        title="Complete JSON Configuration"
                        value={jsonData.value}
                        onChange={(newData) => {
                          updateJsonData(newData);
                          setStatus('✅ JSON updated successfully');
                        }}
                        height="100%"
                      />
                    </div>
                    
                    {/* Additional actions */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700 flex-shrink-0">
                      <button
                        className="btn small"
                        onClick={() => {
                          const validation = validateJSON(JSON.stringify(jsonData.value));
                          if (validation.valid) {
                            setStatus('✅ JSON is valid');
                          } else {
                            setStatus(`❌ Validation failed: ${validation.errors.length} error(s), ${validation.warnings.length} warning(s)`);
                          }
                        }}
                      >
                        Validate Structure
                      </button>
                      <button
                        className="btn success small"
                        onClick={() => {
                          try {
                            const jsonString = JSON.stringify(jsonData.value, null, 2);
                            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
                            downloadBlob(`map-layers-${timestamp}.json`, jsonString);
                            setStatus('✅ JSON file downloaded');
                          } catch (error) {
                            setStatus('❌ Download failed');
                          }
                        }}
                      >
                        Download JSON
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings */}
              {activeTab.value === 'settings' && (
                <div className="h-full w-full p-4 overflow-auto">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 max-w-4xl mx-auto">
                    <SettingsPanel />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Status Bar */}
  
      </div>
    </div>
  );
}

export default App;
