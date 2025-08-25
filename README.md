# HemsWX Map Layers JSON Editor

A modern browser-based tool for creating and editing map layer configurations for aviation weather services. Built with Preact, TypeScript, and Vite for optimal performance and developer experience.

## 🚀 Live Demo

**[Open Map Layers Editor](https://valentingrigorean.github.io/hemswx-map-editor/)**

## ✨ Features

### Core Functionality
- **Drag & Drop JSON Loading** - Drop JSON files directly into the editor
- **Live JSON Editing** - Real-time validation and formatting
- **Multi-step Feature Wizard** - Guided creation of weather/general features
- **Layer Management** - Create, edit, and wire ArcGIS layers (WMS, Tiled, MapImage, PortalItem)
- **Internationalization Support** - 4-language translation management (en, da, nb, sv)
- **Validation & Stats** - Real-time detection of missing/unused layers and translations

### Advanced Features
- **Split-pane Interface** - Efficient workflow with features panel and JSON editor
- **Layer Association System** - Visual grid for linking items to multiple layers
- **Translation Sync/Prune** - Automatic translation key management
- **JSON Download** - Export configurations with timestamps
- **Dark Theme** - Professional dark UI optimized for long editing sessions

## 📋 JSON Structure

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
  "layerNames": "wind_temperature_fl025",
  "opacity": 0.8,
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

## 🛠 Development Setup

### Prerequisites
- Node.js 16+ and npm
- Modern browser with ES2020 support
- Git

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

The application will be available at `http://localhost:3000`

### Available Scripts
```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm run preview  # Preview production build locally
npm run deploy   # Build and deploy to GitHub Pages
```

## 🏗 Architecture

### Technology Stack
- **Frontend**: Preact 10 + TypeScript
- **Build Tool**: Vite 5
- **State Management**: Preact Signals (reactive)
- **Styling**: CSS3 with custom properties (dark theme)
- **Deployment**: GitHub Pages (static)

### Project Structure
```
src/
├── components/           # Preact components
│   ├── wizard/          # Multi-step feature creation wizard
│   ├── App.tsx          # Main application layout
│   ├── Editor.tsx       # JSON textarea with validation
│   ├── Toolbar.tsx      # File operations and actions
│   ├── GroupsPanel.tsx  # Feature browser and management
│   ├── LayerBuilder.tsx # Layer creation/editing interface
│   └── StatusBar.tsx    # Status messages and validation
├── lib/                 # Core utilities and logic
│   ├── types.ts         # TypeScript type definitions
│   ├── jsonStore.ts     # Global state with Preact signals
│   ├── utils.ts         # Helper functions
│   ├── parse.ts         # JSON validation and formatting
│   ├── intl.ts          # Translation management
│   └── layers.ts        # Layer operations and validation
├── styles/              # CSS stylesheets
│   ├── globals.css      # Global styles and theme
│   ├── components.css   # Component-specific styles
│   └── wizard.css       # Wizard modal styles
└── main.tsx            # Application entry point

public/
├── index.html          # HTML template
├── map-layers.json     # Sample data file
└── favicon.svg         # Application icon
```

### Key Design Decisions
1. **Preact Signals** - Chosen for reactive state management without external dependencies
2. **TypeScript** - Ensures type safety for complex JSON structures
3. **CSS Custom Properties** - Enables consistent theming and easy customization
4. **Modular Architecture** - Separates concerns for maintainability and testing
5. **Static Deployment** - No server required, deployable to any static host

## 🚀 Deployment

### Quick Deploy to GitHub Pages

The easiest way to deploy is using the built-in deploy script:

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

3. **Your site will be live** at the URL shown in repository Settings → Pages

### Configuration Notes

- ✅ **Base path**: Already configured as `/hemswx-map-editor/` in `vite.config.ts`
- ✅ **Deploy script**: Already set up in `package.json`
- ✅ **gh-pages package**: Already installed and ready to use

### Deployment Checklist

Before deploying:
- [ ] Test the build locally: `npm run build && npm run preview`
- [ ] Commit and push your changes to main branch
- [ ] Run `npm run deploy`
- [ ] Check the live site after 1-2 minutes

### Alternative: GitHub Actions (Auto-deploy)

For automatic deployment on every push to main, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v2
        with:
          path: ./dist
      - uses: actions/deploy-pages@v2
```

### Troubleshooting

**404 errors on refresh?**
- This is normal for SPAs on GitHub Pages
- The app handles client-side routing correctly

**Build fails?**
- Check that all dependencies are installed: `npm install`
- Ensure TypeScript compilation passes: `npm run build`

**Wrong base path?**
- Update `base: '/your-repo-name/'` in `vite.config.ts`
- Must match your GitHub repository name exactly

### Other Static Hosts
The built application (`/dist` folder) can be deployed to:
- **Netlify** - Drag & drop the `/dist` folder
- **Vercel** - Connect your GitHub repo
- **AWS S3** - Upload `/dist` contents to S3 bucket
- **Any Static Host** - Upload `/dist` contents via FTP/SFTP

## 🔧 Customization

### Theming
Modify CSS custom properties in `src/styles/globals.css`:
```css
:root {
  --bg: #0f1115;        /* Background color */
  --panel: #171923;     /* Panel background */
  --accent: #5b9cff;    /* Primary accent color */
  --text: #e6e8ee;      /* Text color */
  /* ... other properties */
}
```

### Adding Layer Types
Extend layer support in `src/lib/layers.ts`:
```typescript
export const LAYER_TYPES = ['wms', 'tiled', 'mapImage', 'portalItem', 'newType'] as const;

export const getDefaultLayerConfig = (type: LayerType, id: string): LayerConfig => {
  // Add configuration for new layer type
  switch (type) {
    case 'newType':
      return { /* default config */ };
    // ... existing cases
  }
};
```

### Language Support
Add new languages in `src/lib/intl.ts`:
```typescript
export const SUPPORTED_LANGUAGES = ['en', 'da', 'nb', 'sv', 'de'] as const;
```

## 📖 Usage Guide

### Basic Workflow
1. **Load Data** - Drop JSON file or click "Open JSON..."
2. **Browse Features** - View existing weather/general features
3. **Create Features** - Use wizard to add new features step-by-step
4. **Manage Layers** - Create layer definitions and wire to items
5. **Validate** - Check for missing translations and unused layers
6. **Download** - Export updated JSON configuration

### Creating Features
1. Click "🧙‍♂️ Create Feature" button
2. **Step 1**: Choose Weather or General feature type
3. **Step 2**: Configure presentation style and properties
4. **Step 3**: Add items with names and legend settings
5. **Step 4**: Associate items with layers using checkboxes
6. **Step 5**: Review and save the complete feature

### Layer Management
- **Create Layers**: Use the Layers tab to define ArcGIS services
- **Layer Types**: Support for WMS, Tiled, MapImage, and PortalItem
- **Validation**: Real-time checking for missing layer references
- **Usage Tracking**: Visual indicators for used/unused layers

### Translation Management
- **Auto-sync**: Click "Fix Missing Translations" to add missing keys
- **Language Tabs**: Switch between en/da/nb/sv to view status
- **Cleanup**: Use "Remove Unused" to prune old translation keys

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Maintain test coverage for utilities
- Use Preact signals for state management
- Keep components focused and reusable
- Follow the existing code style

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original single-file editor concept and requirements
- HemsWX aviation weather service integration
- Preact and Vite communities for excellent tooling
- Contributors and testers