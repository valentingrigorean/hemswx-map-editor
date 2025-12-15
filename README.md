# HemsWX Map Layers JSON Editor

A modern browser-based tool for creating and editing map layer configurations for aviation weather services. Built with Preact, TypeScript, and Vite, featuring integrated ArcGIS map preview and Monaco Editor for an optimal editing experience.

## Live Demo

**[Open Map Layers Editor](https://valentingrigorean.github.io/hemswx-map-editor/)**

## Features

### Core Functionality
- **Drag & Drop JSON Loading** - Drop JSON files directly into the editor
- **Monaco Editor Integration** - Full-featured code editor with syntax highlighting and validation
- **Live Map Preview** - Real-time ArcGIS map visualization of configured layers
- **Workspace-based Interface** - Unified workspace with navigator, editors, and map preview
- **Layer Management** - Create, edit, and configure ArcGIS layers (WMS, Tiled, VectorTiled, Feature, MapImage, PortalItem)
- **Internationalization Support** - 4-language translation management (en, da, nb, sv)
- **Validation & Stats** - Real-time detection of missing/unused layers and translations

### Advanced Features
- **ArcGIS SDK Integration** - Full ArcGIS Maps SDK for JavaScript support
- **Basemaps Management** - Configure and preview different basemap options
- **WMS Capabilities Parsing** - Auto-discover available WMS layers from service endpoints
- **Layer Visibility Control** - Toggle layer visibility in map preview
- **Legend Panel** - View layer legends in the map preview
- **Settings Panel** - Configure ArcGIS credentials and editor preferences
- **Session Persistence** - Auto-save and restore last editing session
- **JSON Download** - Export configurations with timestamps

## JSON Structure

The editor manages complex JSON configurations with four main sections:

### 1. Weather Features (`weatherFeatures[]`)
Aviation-specific weather layers:
```json
{
  "id": "wind_temperature",
  "name": "Wind and temperature (60 min)",
  "presentation": "multiple",
  "mutuallyExclusive": true,
  "items": [
    {
      "id": "wind_temp_fl025",
      "name": "FL025",
      "showLegend": true,
      "layersIds": ["wind_temp_fl025"]
    }
  ]
}
```

### 2. General Features (`features[]`)
Non-weather navigation and safety features:
```json
{
  "name": "Aviation Obstacles",
  "presentation": "single",
  "items": [
    {
      "id": "obstacles_high",
      "name": "High obstacles (>150m)",
      "layersIds": ["obstacles_150m_plus"]
    }
  ]
}
```

### 3. Layer Definitions (`layers[]`)
ArcGIS service configurations:
```json
{
  "id": "wind_temp_fl025",
  "type": "wms",
  "source": "https://api.met.no/weatherapi/gisforecast/1.0/",
  "options": {
    "layerNames": ["wind_temperature_fl025"],
    "opacity": 0.8
  },
  "zIndex": 10
}
```

### 4. Internationalization (`intl{}`)
Multi-language support:
```json
{
  "intl": {
    "en": { "wind_temp_fl025": "Wind & Temperature FL025" },
    "da": { "wind_temp_fl025": "Vind og temperatur FL025" },
    "nb": { "wind_temp_fl025": "Vind og temperatur FL025" },
    "sv": { "wind_temp_fl025": "Vind och temperatur FL025" }
  }
}
```

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Modern browser with ES2020 support

### Installation
```bash
# Clone the repository
git clone https://github.com/valentingrigorean/hemswx-map-editor.git
cd hemswx-map-editor

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Available Scripts
```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm run preview  # Preview production build locally
npm run deploy   # Build and deploy to GitHub Pages
```

## Architecture

### Technology Stack
- **Frontend**: Preact 10 + TypeScript
- **Build Tool**: Vite 5
- **State Management**: Preact Signals (reactive)
- **Code Editor**: Monaco Editor
- **Maps**: ArcGIS Maps SDK for JavaScript
- **UI Components**: Calcite Components + Tailwind CSS
- **Deployment**: GitHub Pages (static)

### Project Structure
```
src/
├── components/               # Preact components
│   ├── ui/                  # Reusable UI components
│   │   ├── CollapsibleSection.tsx
│   │   ├── ConfigHeader.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── SmartLayerSelect.tsx
│   │   ├── Tabs.tsx
│   │   ├── TranslationForm.tsx
│   │   └── TreeItem.tsx
│   ├── workspace/           # Workspace components
│   │   ├── map-preview/     # Map preview components
│   │   │   ├── MapPreviewPanel.tsx
│   │   │   ├── LayerVisibilityPanel.tsx
│   │   │   ├── LegendPanel.tsx
│   │   │   ├── useMapLayers.ts
│   │   │   └── useBasemap.ts
│   │   ├── ui/             # Workspace-specific UI
│   │   │   └── LayerConfigEditor.tsx
│   │   ├── FeatureEditor.tsx
│   │   ├── LayerEditor.tsx
│   │   ├── LayerEditorModal.tsx
│   │   ├── LayerPicker.tsx
│   │   ├── MapLayerModal.tsx
│   │   ├── MapPreviewPanel.tsx
│   │   ├── Navigator.tsx
│   │   └── QuickLayerModal.tsx
│   ├── settings/            # Settings components
│   │   └── ArcGISSettingsSection.tsx
│   ├── App.tsx              # Main application layout
│   ├── BaseMapsPanel.tsx    # Basemap management
│   ├── EmptyState.tsx       # Empty state display
│   ├── JsonEditor.tsx       # Monaco JSON editor wrapper
│   ├── SettingsPanel.tsx    # Settings panel
│   ├── Sidebar.tsx          # Navigation sidebar
│   ├── ValidationDisplay.tsx # Validation messages
│   └── WorkspacePanel.tsx   # Main workspace container
├── lib/                     # Core utilities and logic
│   ├── arcgis/             # ArcGIS utilities
│   │   ├── index.ts
│   │   └── wmsCapabilities.ts
│   ├── credentials.ts       # ArcGIS credentials management
│   ├── intl.ts             # Translation management
│   ├── jsonStore.ts        # Global state with Preact signals
│   ├── layers.ts           # Layer operations and validation
│   ├── parse.ts            # JSON validation and formatting
│   ├── settings.ts         # Application settings
│   ├── types.ts            # TypeScript type definitions
│   ├── utils.ts            # Helper functions
│   └── validation.ts       # Entity validation
├── styles/
│   └── globals.css         # Global styles and Tailwind
└── main.tsx               # Application entry point

public/
├── map-layers.json        # Sample data file
└── favicon.svg           # Application icon
```

### Key Components

| Component | Description |
|-----------|-------------|
| `WorkspacePanel` | Main container with Navigator, editors, and map preview |
| `Navigator` | Tree-based feature/layer browser |
| `FeatureEditor` | Weather and general feature editing |
| `LayerEditor` | Layer configuration with type-specific options |
| `MapPreviewPanel` | ArcGIS map with layer visualization |
| `JsonEditor` | Monaco-based JSON editing |
| `BaseMapsPanel` | Basemap configuration |
| `SettingsPanel` | ArcGIS credentials and app settings |

### Supported Layer Types

The editor supports 6 ArcGIS layer types (matching Dart `LayerType` enum):
- **wms** - Web Map Service layers (requires layerNames array)
- **tiled** - Cached tile services
- **vectorTiled** - Vector tile services
- **feature** - Feature layer services
- **mapImage** - Dynamic map services
- **portalItem** - ArcGIS Online portal items (requires layerId)

## Deployment

### Quick Deploy to GitHub Pages

```bash
# Build and deploy in one command
npm run deploy
```

This command will:
1. Build the production version (`npm run build`)
2. Deploy the `dist/` folder to the `gh-pages` branch
3. Make the site available at `https://yourusername.github.io/hemswx-map-editor/`

### Manual GitHub Pages Setup

If this is your first deployment:

1. **Enable GitHub Pages** in your repository settings:
   - Go to Settings → Pages
   - Set Source to "Deploy from a branch"
   - Select `gh-pages` branch and `/ (root)` folder
   - Save

2. **Deploy your changes**:
   ```bash
   npm run deploy
   ```

### Other Static Hosts
The built application (`/dist` folder) can be deployed to:
- **Netlify** - Drag & drop the `/dist` folder
- **Vercel** - Connect your GitHub repo
- **AWS S3** - Upload `/dist` contents to S3 bucket
- **Any Static Host** - Upload `/dist` contents via FTP/SFTP

## Usage Guide

### Basic Workflow
1. **Load Data** - Drop JSON file or click "Open JSON..."
2. **Browse Features** - Use the Navigator to view weather/general features
3. **Edit Features** - Click on features to edit in the Feature Editor
4. **Manage Layers** - Create and configure layer definitions
5. **Preview Map** - View layers on the integrated map preview
6. **Validate** - Check for missing translations and unused layers
7. **Download** - Export updated JSON configuration

### Map Preview
The integrated ArcGIS map preview allows you to:
- Visualize configured layers in real-time
- Toggle individual layer visibility
- View layer legends
- Switch between different basemaps
- Test layer configurations before exporting

### Layer Management
- **Create Layers**: Use the Layer Editor to define ArcGIS services
- **Layer Types**: Support for WMS, Tiled, VectorTiled, Feature, MapImage, and PortalItem
- **WMS Discovery**: Auto-discover available layers from WMS endpoints
- **Validation**: Real-time checking for missing layer references
- **Custom Options**: Key/value editor for additional layer properties

### Translation Management
- **Auto-sync**: Translation keys are created from feature/item names
- **Language Tabs**: Switch between en/da/nb/sv to view and edit
- **Missing Detection**: Shows untranslated keys per language
- **Fallback System**: Missing translations fall back to English

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use Preact signals for state management
- Keep components focused and reusable
- Follow the existing code style
- Add comments only when they explain "why", not "what"

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- HemsWX aviation weather service integration
- Esri ArcGIS Maps SDK for JavaScript
- Preact, Vite, and Monaco Editor communities
