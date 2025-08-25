# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based JSON editor for HemsWX aviation weather map layers. It's a modern React/TypeScript single-page application that helps create and edit complex map layer configurations for aviation weather services, with **1:1 compatibility** with the Dart mobile app model.

The application consists of:

- **React/TypeScript application** (`src/`) - Modern web app with Vite build system
- **Sample data file** (`map-layers.json`) - Example configuration for aviation weather and general features
- **Dart compatibility validation** - Ensures data structures match the mobile app exactly

## Architecture

### Technology Stack
- **Frontend**: React with Preact/Signals for state management
- **Language**: TypeScript with strict type checking
- **Build**: Vite for fast development and bundling
- **Styling**: Tailwind CSS for utility-first styling

### Core Components

- **App.tsx** - Main application shell with tab navigation
- **FeatureDetailsPanel.tsx** - Feature creation/editing with wizard-like interface
- **LayerDetailsPanel.tsx** - Layer configuration with sublayer management
- **GroupsPanel.tsx** - Feature browser and overview
- **JsonEditor.tsx** - Raw JSON editing with validation
- **IntlEditor.tsx** - Internationalization management across 4 languages

### State Management (src/lib/)
- **jsonStore.ts** - Central Preact signals-based state for all data
- **types.ts** - TypeScript interfaces matching Dart model exactly
- **parse.ts** - JSON validation with comprehensive Dart model enforcement
- **validation.ts** - Granular validation functions for all entities
- **layers.ts** - Layer creation, validation, and default configurations

### Data Structure

The JSON structure matches the Dart `MapConfigurationEntity` exactly:

1. **weatherFeatures[]** - Aviation weather layers (UIFeatureEntity[])
2. **features[]** - General navigation/safety features (UIFeatureEntity[])
3. **layers[]** - Physical layer definitions (LayerEntity[])
4. **intl{}** - Internationalization strings for 4 languages (en, da, nb, sv)

### Supported Layer Types

The editor supports 6 ArcGIS layer types (matching Dart `LayerType` enum):
- **wms** - Web Map Service layers (requires layerNames array)
- **tiled** - Cached tile services
- **vectorTiled** - Vector tile services  
- **feature** - Feature layer services
- **mapImage** - Dynamic map services
- **portalItem** - ArcGIS Online portal items (requires layerId)

## Development Workflow

### Running the Application

Modern Vite-based development with hot reload:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Opens http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

Manual testing workflow:
1. Load sample `map-layers.json` file via toolbar
2. Create/edit features and layers using dedicated panels
3. Real-time validation shows errors immediately
4. Export and verify JSON structure
5. Test internationalization across all 4 languages

## Critical Implementation Details

### Dart Model Compatibility

**IMPORTANT**: This implementation maintains strict 1:1 compatibility with the Dart mobile app:

- **Required fields**: All Dart `required` fields are enforced in validation
- **Field types**: TypeScript interfaces match Dart entities exactly  
- **Validation rules**: Comprehensive validation matching Dart model constraints
- **Default values**: Match Dart model defaults (e.g., zIndex: 0, showLegend: false)

### Validation System

Multi-layered validation ensures data integrity:

1. **Real-time validation** in `parse.ts` - Catches structural issues
2. **Component-level validation** - UI prevents invalid input
3. **Type-specific validation** - Layer types have specific requirements
4. **Dart compatibility checks** - Ensures mobile app compatibility

### Feature Management

- **Single vs Multiple presentation** - Affects UI behavior and validation
- **Item inheritance** - Single features with one item can inherit name/ID
- **Layer association** - Items must reference existing layer definitions
- **Legend support** - Custom legend URLs and descriptions per item

### Layer Management

- **Sublayer system** - Each layer can contain multiple rendering configs
- **Type-specific options** - WMS requires layerNames, portalItem requires layerId
- **Custom options** - Key/value editor for additional properties
- **Opacity handling** - Stored in options.opacity per Dart model

## Common Development Tasks

### Adding New Layer Types

To support additional layer types:
1. Update `LAYER_TYPES` array in `src/lib/layers.ts`
2. Add type to `LayerConfig` interface in `src/lib/types.ts`
3. Update `getDefaultLayerConfig()` with type-specific defaults
4. Add validation rules in `validateLayer()` function
5. Update UI in `LayerDetailsPanel.tsx` for type-specific options

### Adding Validation Rules

Extend validation in multiple places:
1. **Structural validation**: Update `validateJSON()` in `src/lib/parse.ts`
2. **Entity validation**: Add rules in `src/lib/validation.ts`
3. **UI validation**: Add real-time checks in component files

### Internationalization

The system supports 4 languages (en, da, nb, sv):
1. **Auto-sync**: Feature/item names automatically create translation keys
2. **Manual editing**: Direct key/value editing in IntlEditor
3. **Missing detection**: Shows untranslated keys per language
4. **Fallback system**: Missing translations fall back to English

## File Structure

```
src/
├── components/           # React components
│   ├── FeatureDetailsPanel.tsx
│   ├── LayerDetailsPanel.tsx
│   ├── GroupsPanel.tsx
│   └── ...
├── lib/                  # Core logic
│   ├── jsonStore.ts     # State management
│   ├── types.ts         # TypeScript types
│   ├── parse.ts         # JSON validation
│   ├── validation.ts    # Entity validation
│   └── layers.ts        # Layer utilities
├── styles/
│   └── globals.css      # Tailwind CSS
└── main.tsx            # App entry point
```

## Key Differences from Previous Version

This React/TypeScript version replaces the old single HTML file and provides:

- ✅ **Strict Dart compatibility** with comprehensive validation
- ✅ **Modern development experience** with TypeScript and hot reload
- ✅ **Better UI/UX** with dedicated panels for different entity types
- ✅ **Real-time validation** preventing invalid configurations
- ✅ **Key/value options editor** for flexible layer configuration
- ✅ **Duplicate ID prevention** with automatic suggestions
- ✅ **Smart type switching** with automatic options cleanup

## Code Style & Standards

### Comments Policy

**DO NOT** add meaningless comments that simply restate what the code does:

❌ **Bad Examples:**
```typescript
// Use new notification system
import('./notifications').then(({ addNotification }) => {

// Clear the array
array.length = 0;

// Set the status message
statusMessage.value = message;

// Loop through items
items.forEach(item => {
```

✅ **Good Examples (when comments add value):**
```typescript
// Dart model compatibility: opacity stored in options, not as direct field
layer.options.opacity = 0.8;

// Enhanced validation for multiple vs single presentation
if (draftVal.presentation === 'multiple') {

// Skip special handled fields that have dedicated UI
if (key === 'layerNames' || key === 'layerId' || key === 'opacity') return null;
```

**Guidelines:**
- Comments should explain **why**, not **what**
- Document business logic, compatibility requirements, or complex algorithms
- Avoid comments that become outdated when code changes
- Use clear variable/function names instead of explanatory comments
- Comments explaining Dart compatibility are valuable
- API documentation comments are encouraged

## Browser Compatibility

Targets modern browsers with ES2020+ support. Uses Vite for optimal bundling and development experience.