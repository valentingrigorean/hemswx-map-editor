import { useSignal } from '@preact/signals';
import { 
  jsonData, 
  activeTab, 
  activeRightTab, 
  statusMessage, 
  dataSummary,
  wizardState
} from './lib/jsonStore';
import Editor from './components/Editor';
import Toolbar from './components/Toolbar';
import GroupsPanel from './components/GroupsPanel';
import LayerBuilder from './components/LayerBuilder';
import StatusBar from './components/StatusBar';
import WizardModal from './components/wizard/WizardModal';
import './styles/globals.css';
import './styles/components.css';
import './styles/wizard.css';

const MAIN_TABS = [
  { id: 'features', label: 'Features' },
  { id: 'layers', label: 'Layers' },
  { id: 'tools', label: 'Tools' },
  { id: 'internationalization', label: 'i18n' },
  { id: 'stats', label: 'Stats' }
] as const;

const RIGHT_TABS = [
  { id: 'json', label: 'JSON' },
  { id: 'feature', label: 'Feature' },
  { id: 'layer', label: 'Layer' }
] as const;

function App() {
  const fileInputRef = useSignal<HTMLInputElement | null>(null);

  const handleLoadFile = () => {
    fileInputRef.value?.click();
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Map Layers JSON Editor</h1>
        <button className="btn" onClick={handleLoadFile}>
          Open JSON…
        </button>
        <input 
          ref={fileInputRef}
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
                    jsonData.value = data;
                    statusMessage.value = '✅ JSON file loaded successfully';
                  } catch (error) {
                    statusMessage.value = `❌ Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`;
                  }
                }
              };
              reader.readAsText(file);
            }
          }}
        />
        <Toolbar />
        <div className="quick-summary">
          <span className="muted">{dataSummary.value}</span>
          <div className="status muted">{statusMessage.value}</div>
        </div>
      </header>

      <div className="main-layout">
        {/* Left Column */}
        <div className="main-column left">
          <div className="tabs">
            <div className="tab-buttons">
              {MAIN_TABS.map(tab => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab.value === tab.id ? 'active' : ''}`}
                  onClick={() => activeTab.value = tab.id as any}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={`tab-content ${activeTab.value === 'features' ? 'active' : ''}`}>
              <GroupsPanel />
            </div>

            <div className={`tab-content ${activeTab.value === 'layers' ? 'active' : ''}`}>
              <LayerBuilder />
            </div>

            <div className={`tab-content ${activeTab.value === 'tools' ? 'active' : ''}`}>
              <div className="tools-section">
                <h3>Validation & Cleanup</h3>
                <div className="tools-grid">
                  <button className="btn tool-btn">Validate</button>
                  <button className="btn tool-btn">Fix Missing Translations</button>
                  <button className="btn tool-btn">Remove Unused</button>
                  <button className="btn tool-btn">Format</button>
                </div>
              </div>
            </div>

            <div className={`tab-content ${activeTab.value === 'internationalization' ? 'active' : ''}`}>
              <div className="text-center muted p-4">
                Internationalization panel coming soon
              </div>
            </div>

            <div className={`tab-content ${activeTab.value === 'stats' ? 'active' : ''}`}>
              <div className="text-center muted p-4">
                Stats panel coming soon
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="main-column right">
          <div className="right-tab-buttons">
            {RIGHT_TABS.map(tab => (
              <button
                key={tab.id}
                className={`right-tab-btn ${activeRightTab.value === tab.id ? 'active' : ''}`}
                onClick={() => activeRightTab.value = tab.id as any}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={`tab-content ${activeRightTab.value === 'json' ? 'active' : ''}`}>
            <div className="toolbar">
              <span className="muted">JSON (editable)</span>
            </div>
            <Editor />
          </div>

          <div className={`tab-content ${activeRightTab.value === 'feature' ? 'active' : ''}`}>
            <div className="toolbar">
              <span className="muted">Selected Feature</span>
            </div>
            <div className="text-center muted p-4">
              Select a feature to preview its JSON
            </div>
          </div>

          <div className={`tab-content ${activeRightTab.value === 'layer' ? 'active' : ''}`}>
            <div className="toolbar">
              <span className="muted">Selected Layer</span>
            </div>
            <div className="text-center muted p-4">
              Select a layer to preview its JSON
            </div>
          </div>
        </div>
      </div>

      <StatusBar />
      
      {wizardState.value.isOpen && <WizardModal />}
    </div>
  );
}

export default App;