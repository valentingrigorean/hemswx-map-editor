# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based JSON editor for HemsWX aviation weather map layers. It's a single-page application that helps create and edit complex map layer configurations for aviation weather services. The application consists of:

- **Single HTML file application** (`index.html`) - Self-contained web app with embedded CSS and JavaScript
- **Sample data file** (`map-layers.json`) - Example configuration for aviation weather and general features
- **Static documentation** (`README.md`) - Comprehensive user guide

## Architecture

### Core Components

The application follows a modular JavaScript architecture with several key classes:

- **AppState** - Central state management for JSON data and wizard state
- **UIController** - Handles DOM updates, status messages, and editor synchronization  
- **FeatureBrowser** - Manages the feature list display and CRUD operations
- **IntlStatus** - Handles internationalization status across 4 languages (en, da, nb, sv)
- **Wizard** - Multi-step feature creation/editing with validation
- **Utils** - Helper functions for JSON parsing, layer ID collection, and string processing

### Data Structure

The JSON structure has three main sections:

1. **weatherFeatures[]** - Aviation weather layers (wind, radar, clouds, etc.)
2. **features[]** - General navigation/safety features (terrain, obstacles, POI)
3. **layers[]** - Physical layer definitions with ArcGIS layer configurations
4. **intl{}** - Internationalization strings for 4 languages

### Supported Layer Types

The editor supports multiple ArcGIS layer types:
- **WMS** - Web Map Service layers
- **Tiled** - Cached tile services
- **PortalItem** - ArcGIS Online portal items
- **MapImage** - Dynamic map services

## Development Workflow

### Running the Application

This is a static web application - no build process required:

```bash
# Serve locally (any HTTP server)
python -m http.server 8000
# or
npx serve .

# Open browser
open http://localhost:8000
```

### Testing

No formal test framework - testing is done manually:
1. Load sample `map-layers.json` file
2. Create new features using the wizard
3. Validate JSON structure
4. Test internationalization features
5. Export and verify JSON integrity

### Key Workflows

#### Adding New Layer Types
To support additional ArcGIS layer types, modify the wizard's layer association logic around line 798 in `index.html`.

#### Extending Validation
Add custom validation rules in the `updateReview()` function around line 849.

#### Adding New Languages
Extend the `languages` array in the `save()` method around line 933 and update internationalization tabs.

## Important Implementation Details

### Feature Creation Wizard
- 5-step process: Type selection → Configuration → Items → Layer Association → Review
- Real-time validation with error/warning messages
- Automatic internationalization key generation
- Layer association validation against existing layer definitions

### State Management
- Manual JSON editing synchronizes with UI state automatically
- All changes update multiple UI components (browser, stats, internationalization status)
- Undo/redo not implemented - relies on browser/editor undo

### Layer Association System
- Items must be associated with existing layer definitions
- Validation prevents orphaned layer references
- Visual grid interface for selecting multiple layers per item

## Common Development Tasks

### Modifying Wizard Steps
The wizard steps are defined in the HTML structure. To add/remove steps:
1. Update stepper HTML structure
2. Add corresponding step content div
3. Update `updateContent()` and validation logic

### Adding Feature Validation
Extend `validateStep()` method in the Wizard class to add custom validation rules for each step.

### Customizing Layer Options
Layer options are handled in the layer association step. Extend the `buildLayerAssociation()` method to support additional layer configuration options.

## File Locations

- Main application: `index.html` (self-contained)
- Sample data: `map-layers.json`
- Documentation: `README.md`

## Browser Compatibility

Targets modern browsers with ES6+ support. Uses CSS custom properties and modern DOM APIs. No polyfills included.