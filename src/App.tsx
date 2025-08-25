import { useRef, useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
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
import GroupsPanel from './components/GroupsPanel';
import LayerBuilder from './components/LayerBuilder';
import LayerDetailsPanel from './components/LayerDetailsPanel';
import FeatureDetailsPanel from './components/FeatureDetailsPanel';
import StatusBar from './components/StatusBar';
import I18nTable from './components/I18nTable';
import TranslationKeysBrowser from './components/TranslationKeysBrowser';
import TranslationEditorPanel from './components/TranslationEditorPanel';
import SettingsPanel from './components/SettingsPanel';
import EmptyState from './components/EmptyState';
import './styles/globals.css';
import { validateJSON } from './lib/parse';
import { formatJSON } from './lib/parse';
import { downloadBlob } from './lib/utils';

const APP_TABS = [
  { id: 'features', label: 'Features' },
  { id: 'layers', label: 'Layers' },
  { id: 'internationalization', label: 'i18n' },
  { id: 'json', label: 'JSON' },
  { id: 'settings', label: 'Settings' }
] as const;

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedTranslationKey = useSignal<string | null>(null);
  const i18nViewMode = useSignal<'split' | 'table'>('split');

  // Auto-load last session on app start
  useEffect(() => {
    if (!hasJson.value) {
      loadLastJsonData();
    }
  }, []);

  const handleLoadFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="app">
      {/* Hidden file input always mounted to support EmptyState open */}
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
                  const data = JSON.parse(text);
                  updateJsonData(data);
                  setStatus('✅ JSON file loaded successfully');
                } catch (error) {
                  setStatus(`❌ Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`);
                }
              }
            };
            reader.readAsText(file);
          }
        }}
      />

      {hasJson.value && (
        <header
          className="flex gap-3 items-center p-3 border-b border-slate-700 sticky top-0 z-[5]"
          style={{ background: 'rgba(15, 17, 21, 0.9)', backdropFilter: 'saturate(1.2) blur(6px)' }}
        >
          <h1 className="text-base m-0 mr-2 opacity-95">Map Layers JSON Editor</h1>
          <button className="btn" onClick={handleLoadFile}>
            Open JSON…
          </button>
          <div className="ml-auto">
            {hasJson.value && <span className="text-slate-500">{dataSummary.value}</span>}
          </div>
        </header>
      )}

      {!hasJson.value ? (
        <div className="p-6">
          <EmptyState onOpenClick={handleLoadFile} />
        </div>
      ) : (
        <div className="p-3 min-h-[calc(100vh-80px)]">
          {/* App Tabs */}
          <div className="flex gap-1 mb-3 border-b border-slate-700 pb-2">
            {APP_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-2 rounded-t-md text-xs transition-all duration-150 text-decoration-none ${
                  activeTab.value === tab.id
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-slate-950 text-slate-500 border border-slate-700 hover:border-slate-600 hover:text-slate-200'
                }`}
                onClick={() => (activeTab.value = tab.id as any)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Views */}
          {/* Features: split view */}
          {activeTab.value === 'features' && (
            <div className="flex gap-3 h-[calc(100vh-200px)] overflow-hidden">
              <div className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col">
                <GroupsPanel />
              </div>
              <div className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col">
                <FeatureDetailsPanel />
              </div>
            </div>
          )}

          {/* Layers: split view */}
          {activeTab.value === 'layers' && (
            <div className="flex gap-3 h-[calc(100vh-200px)] overflow-hidden">
              <div className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col">
                <LayerBuilder />
              </div>
              <div className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col">
                <LayerDetailsPanel />
              </div>
            </div>
          )}

          {/* i18n: view mode toggle and content */}
          {activeTab.value === 'internationalization' && (
            <div>
              {/* View mode toggle */}
              <div className="flex gap-1 mb-3 border-b border-slate-700 pb-2">
                <button
                  className={`px-3 py-1.5 rounded text-xs transition-all duration-150 ${
                    i18nViewMode.value === 'split'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-600 hover:text-slate-200'
                  }`}
                  onClick={() => i18nViewMode.value = 'split'}
                >
                  Split View
                </button>
                <button
                  className={`px-3 py-1.5 rounded text-xs transition-all duration-150 ${
                    i18nViewMode.value === 'table'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-600 hover:text-slate-200'
                  }`}
                  onClick={() => i18nViewMode.value = 'table'}
                >
                  Table View
                </button>
              </div>

              {/* Split view */}
              {i18nViewMode.value === 'split' && (
                <div className="flex gap-3 h-[calc(100vh-200px)] overflow-hidden">
                  <div className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col">
                    <div className="flex-1 min-h-0 overflow-auto">
                      <TranslationKeysBrowser 
                        selectedKey={selectedTranslationKey.value}
                        onSelectKey={(key) => selectedTranslationKey.value = key}
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col">
                    <TranslationEditorPanel selectedKey={selectedTranslationKey.value} />
                  </div>
                </div>
              )}

              {/* Table view */}
              {i18nViewMode.value === 'table' && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col h-[calc(100vh-200px)]">
                  <div className="flex-1 min-h-0">
                    <I18nTable />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* JSON: full editor */}
          {activeTab.value === 'json' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col h-[calc(100vh-180px)]">
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
          )}

          {/* Settings: single panel */}
          {activeTab.value === 'settings' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <SettingsPanel />
            </div>
          )}
        </div>
      )}

      <StatusBar />
      
    </div>
  );
}

export default App;
