class FeatureBrowser {
  static update(data) {
    FeatureBrowser.updateFeatureList('weatherFeatures', 'weatherFeaturesList', data);
    FeatureBrowser.updateFeatureList('features', 'generalFeaturesList', data);
    FeatureBrowser.renderPreview(data);
  }

  static updateFeatureList(featureType, containerId, data) {
    const container = document.getElementById(containerId);
    const features = data[featureType] || [];
    
    if (features.length === 0) {
      container.innerHTML = `<div style="padding:12px; color:var(--muted); text-align:center;">No ${featureType === 'weatherFeatures' ? 'weather ' : 'general '}features found</div>`;
      return;
    }
    
    container.innerHTML = '';
    
    features.forEach((feature, index) => {
      const featureEl = document.createElement('div');
      featureEl.className = 'feature-list-item';
      featureEl.onclick = () => FeatureBrowser.select(featureType, index);
      
      const itemCount = (feature.items || []).length;
      const featureName = feature.name || feature.id || 'Unnamed Feature';
      const presentationType = feature.presentation || 'single';
      const exclusiveText = feature.mutuallyExclusive ? ' • Exclusive' : '';
      
      featureEl.innerHTML = `
        <div class="feature-info">
          <div class="feature-name">${featureName}</div>
          <div class="feature-details">${itemCount} item(s) • ${presentationType}${exclusiveText}</div>
        </div>
        <div class="feature-actions">
          <button class="btn btn small" onclick="event.stopPropagation(); Wizard.edit('${featureType === 'weatherFeatures' ? 'weatherFeature' : 'feature'}', ${index})">Edit</button>
          <button class="btn danger small" onclick="event.stopPropagation(); FeatureBrowser.delete('${featureType}', ${index})">Delete</button>
        </div>
      `;
      if (app.selected && app.selected.type === featureType && app.selected.index === index) {
        featureEl.classList.add('selected');
      }
      
      container.appendChild(featureEl);
    });
  }

  static delete(featureType, featureIndex) {
    const features = app.data[featureType] || [];
    const feature = features[featureIndex];
    
    if (!feature) return;
    
    const featureName = feature.name || feature.id || 'Unnamed Feature';
    if (confirm(`Delete feature "${featureName}"? This cannot be undone.`)) {
      features.splice(featureIndex, 1);
      if (app.selected && app.selected.type === featureType && app.selected.index === featureIndex) {
        app.selected = { type: null, index: -1 };
      }
      App.refresh();
      ui.setStatus(`🗑️ Deleted feature "${featureName}"`);
    }
  }

  static select(featureType, featureIndex) {
    app.selected = { type: featureType, index: featureIndex };
    FeatureBrowser.update(app.data);
  }

  static renderPreview(data) {
    const previewEl = document.getElementById('featureJsonPreview');
    if (!previewEl) return;

    const sel = app.selected || { type: null, index: -1 };
    const arr = data[sel.type] || [];
    const feature = arr[sel.index];

    if (!feature) {
      previewEl.value = '';
      previewEl.placeholder = 'Select a feature to preview its JSON';
      return;
    }

    try {
      previewEl.value = JSON.stringify(feature, null, 2);
    } catch (e) {
      previewEl.value = 'Error rendering JSON';
    }
  }
}
