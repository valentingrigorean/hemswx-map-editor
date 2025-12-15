import { activeTab } from '../lib/jsonStore';

export default function Sidebar() {
  const tabs = [
    { id: 'workspace', label: 'Features', icon: <LayerStackIcon /> },
    { id: 'basemaps', label: 'Basemaps', icon: <MapIcon /> },
    { id: 'json', label: 'JSON', icon: <CodeIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ] as const;

  return (
    <div className="w-16 flex flex-col items-center py-4 bg-slate-950 border-r border-slate-700 h-full flex-shrink-0 z-10">
      <div className="mb-6">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
          H
        </div>
      </div>
      
      <div className="flex flex-col gap-2 w-full px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => activeTab.value = tab.id as any}
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group relative
              ${activeTab.value === tab.id 
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }
            `}
            title={tab.label}
          >
            {tab.icon}
            
            {/* Tooltip on hover */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-slate-200 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-slate-700 transition-opacity">
              {tab.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Simple Icons
function LayerStackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 14 9-5-9-5-9 5 9 5z"/>
      <path d="m12 14 9-5-9-5-9 5 9 5z" transform="translate(0 6)"/>
      <path d="m12 14 9-5-9-5-9 5 9 5z" transform="translate(0 12)"/>
    </svg>
  );
}

function MapIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" x2="9" y1="3" y2="18" />
      <line x1="15" x2="15" y1="6" y2="21" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
