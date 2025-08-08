# Map Layers JSON Editor

A comprehensive web-based tool for creating and editing map layer configurations for aviation weather services. This editor supports the HemsWX mobile application's complex map layer structure.

## 🚀 Live Demo

**[Open Map Layers Editor](https://yourusername.github.io/repository-name/)**

*Replace `yourusername` and `repository-name` with your actual GitHub username and repository name*

## 📋 JSON Structure Overview

The editor manages a complex JSON structure with three main sections:

### 1. Weather Features (`weatherFeatures[]`)
Aviation-specific weather layers for flight operations:

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
      "layersIds": ["wind_temp_fl025"]
    }
  ]
}
```

### 2. General Features (`features[]`)  
Non-weather features for navigation and safety:

```json
{
  "id": "water_rescue", 
  "name": "Water Rescue",
  "presentation": "multiple",
  "items": [
    {
      "id": "wave_height",
      "name": "Wave height", 
      "showLegend": true,
      "legendUrl": "https://example.com/legend.png",
      "layersIds": ["wave_height"]
    }
  ]
}
```

### 3. Map Layers (`layers[]`)
Physical map layer definitions with various sources:

```json
{
  "id": "icing_index",
  "layers": [
    {
      "type": "wms",
      "source": "https://halo-wms.met.no/halo/default.map",
      "options": {
        "layerNames": ["icing_index_max"]
      }
    }
  ]
}
```

## 🛠️ Supported Layer Types

The editor supports all major ArcGIS layer types:

### WMS Layers
```json
{
  "type": "wms",
  "source": "https://halo-wms.met.no/halo/default.map",
  "options": {
    "opacity": 0.4,
    "layerNames": ["precipitation_1h"]
  }
}
```

### Tiled Map Service
```json
{
  "type": "tiled", 
  "source": "https://services.geodataonline.no/arcgis/rest/services/GeocacheHelning/MapServer",
  "zIndex": 0,
  "options": {
    "opacity": 0.4
  }
}
```

### ArcGIS Portal Items
```json
{
  "type": "portalItem",
  "source": "f0f621fea0c34ab080a97a682d3d6845",
  "options": {
    "layerId": 0
  }
}
```

### Map Image Service
```json
{
  "type": "mapImage",
  "source": "https://gis3.nve.no/arcgis/rest/services/wmts/KastWMTS/MapServer",
  "options": {
    "opacity": 0.4
  }
}
```

## ✨ Editor Features

### Multi-Step Wizard
- **Step 1**: Choose Weather or General Feature
- **Step 2**: Configure presentation and behavior
- **Step 3**: Add items with names and properties  
- **Step 4**: Associate layers with each item
- **Step 5**: Review and validate before creation

### Feature Management
- **Visual Browser**: See all features organized by type
- **Edit Mode**: Modify existing features through wizard
- **Validation**: Real-time checking of layer associations
- **Preview**: JSON preview before saving

### Internationalization (i18n)
Multi-language support for 4 locales:
- **English (en)**: Primary language
- **Danish (da)**: Danish translations
- **Norwegian Bokmål (nb)**: Norwegian translations  
- **Swedish (sv)**: Swedish translations

### Layer Association
- **Visual Selection**: Checkboxes for each available layer
- **Validation**: Ensures all items have layer associations
- **Missing Layer Detection**: Warns about referenced layers that don't exist

## 🎯 Presentation Types

### Single Selection
```json
"presentation": "single"
```
Only one item can be active at a time (radio button behavior).

### Multiple Selection  
```json
"presentation": "multiple"
```
Multiple items can be active simultaneously (checkbox behavior).

### Mutually Exclusive
```json
"presentation": "multiple",
"mutuallyExclusive": true
```
Multiple items available but selecting one deselects others.

## 📐 What's Possible

### ✅ Supported Features
- **All ArcGIS Layer Types**: WMS, Tiled, Portal Items, Map Image
- **Complex Layer Options**: Opacity, layer names, sub-layer IDs
- **Legend Integration**: Custom legend URLs and descriptions
- **Multi-language Content**: Full i18n support for UI elements
- **Feature Hierarchies**: Groups with multiple items
- **Layer Validation**: Ensures layer references exist
- **JSON Export/Import**: Full round-trip editing

### ✅ Advanced Capabilities
- **Drag & Drop**: Direct file import
- **Real-time Validation**: Immediate feedback on errors
- **Translation Sync**: Auto-populate missing translations
- **Unused Cleanup**: Remove orphaned layers and translations
- **Layer Association Matrix**: Visual layer-to-item mapping

## ⚠️ Limitations & Missing Features

### Layer Types Not Yet Supported
Based on code analysis, these layer types might need manual JSON editing:

- **Feature Services**: Direct feature layer connections
- **Vector Tile Services**: Modern vector map tiles
- **Scene Services**: 3D layer support  
- **Image Services**: Raster analysis layers
- **Group Layers**: Layer hierarchies
- **Custom Layer Types**: Non-standard implementations

### Missing Editor Features
- **Layer Options Editor**: Advanced layer configuration
- **Geometry Filters**: Spatial query capabilities
- **Time Dimensions**: Temporal layer controls
- **Symbology Editor**: Custom rendering styles
- **Layer Ordering**: Manual z-index management

### Current Workarounds
For unsupported features, you can:
1. Create basic structure with the wizard
2. Export JSON and manually edit advanced properties
3. Re-import to continue using the editor

## 🔧 Development Notes

### Adding New Layer Types
To support additional layer types, modify the wizard's layer association logic:

```javascript
// In wizard JavaScript, around line 790
const layerTypes = ['wms', 'tiled', 'portalItem', 'mapImage', 'newType'];
```

### Extending Validation
Add custom validation rules in the `updateReview()` function:

```javascript
// Custom validation for new properties
if (item.customProperty && !validateCustomProperty(item.customProperty)) {
  validationMessages.push({
    type: 'error', 
    message: `Invalid custom property for "${item.name}"`
  });
}
```

## 💡 Best Practices

### Layer Naming
- Use descriptive, unique layer IDs
- Follow consistent naming conventions
- Include data source or update frequency in names

### Feature Organization  
- Group related items under logical features
- Use appropriate presentation types for user experience
- Provide meaningful legend URLs for complex data

### Translation Management
- Use descriptive translation keys
- Keep translations synchronized across all languages
- Use the "Fix Missing Translations" tool regularly

### Performance Optimization
- Limit simultaneous active layers
- Use appropriate opacity settings
- Consider layer update frequencies for real-time data

## 🤝 Contributing

1. Fork this repository
2. Test changes thoroughly with real map layer files
3. Ensure all layer types validate correctly
4. Submit pull requests with clear descriptions

## 📄 License

MIT License - Free to use, modify, and distribute.

---

**Need Help?** 
- Check validation messages for guidance  
- Use the built-in JSON formatter for syntax issues
- Open GitHub issues for feature requests or bug reports

**TODO**  
Use Akavache  
Better sync  
New map  
New User authentication  
Cleanup code  

User authentication is the same in other apps, may be resuable

Bottom menu should be flexible , the item may later come from the server  
I thing a object list like this maybe:  
id  
name  
deccription  
icon  
type  
parameters  
order  
visible  

Use spiltview were applicabale  
Design inspired by IOS/Google Map app  
Settings like IOS, profile info on top  

New design  
Inspired by Microsoft Teams  

https://www.figma.com/proto/4cwZByyrtDI3yiFzA3VDS6/HemsWX?node-id=218%3A4620&viewport=487%2C-324%2C0.125&scaling=scale-down  

iPAD  

https://www.figma.com/proto/4cwZByyrtDI3yiFzA3VDS6/HemsWX?node-id=362%3A6&viewport=249%2C11%2C0.06457360833883286&scaling=min-zoom  



Since support iOS 13 new features is avaiebal:

https://developer.apple.com/videos/play/wwdc2020/10045/

https://developer.apple.com/videos/play/wwdc2020/10027

Map will have layers  
This will come from the server  
It may be possible to save Map settings to faourite list, or get a suggestion from server


POI  
They are static, except Weater Station that have reltime updated icon status

Map  
IGA (spiltview)  
Radar (spiltview)  
SIQWX  
AnalyseWX  
Satelitte  
CostalForcast  



Sigmet/Airmmet  may be moved into map  
Route Forcast may be moved into map

Map  
https://developers.arcgis.com/net/

https://www.geodata.no/produkter-og-tjenester  

raster  
https://services.geodataonline.no/arcgis/rest/services/Geocache_UTM33_EUREF89  
 
vector tiles  
https://services.geodataonline.no/arcgis/rest/services/GeocacheVector  
 
overlay  
https://services.geodataonline.no/arcgis/rest/services/Geomap_UTM33_EUREF89  




@startuml
start

if (Enter username or phone) then (phone)

else (username)
  :Enter phone
  __sequence__ and __activity__ diagrams;
endif

  :Enter pin
  __sequence__ and __activity__ diagrams;
stop
@enduml

