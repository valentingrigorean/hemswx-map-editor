class Wizard {
  static show(mode = 'create', featureType = '', featureIndex = -1) {
    app.wizard.mode = mode;
    app.wizard.editingType = featureType;
    app.wizard.editingIndex = featureIndex;
    
    document.getElementById('featureWizard').classList.add('active');
    
    if (mode === 'edit') {
      Wizard.loadExistingFeature(featureType, featureIndex);
    } else {
      app.reset();
    }
    
    Wizard.updateTitle();
    Wizard.updateStepper();
    Wizard.updateContent();
  }

  static hide() {
    document.getElementById('featureWizard').classList.remove('active');
  }

  static edit(featureType, featureIndex) {
    Wizard.show('edit', featureType, featureIndex);
  }

  static loadExistingFeature(featureType, featureIndex) {
    const featureArray = featureType === 'weatherFeature' ? app.data.weatherFeatures : app.data.features;
    const feature = featureArray[featureIndex];
    
    if (!feature) {
      alert('Feature not found!');
      Wizard.hide();
      return;
    }
    
    app.wizard.currentStep = 1;
    app.wizard.data = {
      featureType: featureType,
      featureId: feature.id || '',
      featureName: feature.name || '',
      presentation: feature.presentation || 'single',
      mutuallyExclusive: feature.mutuallyExclusive || false,
      items: (feature.items || []).map(item => ({
        id: item.id,
        name: item.name,
        showLegend: item.showLegend || false,
        legendUrl: item.legendUrl || undefined,
        legendDescription: item.legendDescription || undefined,
        layersIds: [...(item.layersIds || [])]
      }))
    };
    
    // Update form values
    document.querySelector(`input[name="featureType"][value="${featureType}"]`).checked = true;
    document.getElementById('featureId').value = app.wizard.data.featureId;
    document.getElementById('featureName').value = app.wizard.data.featureName;
    document.getElementById('presentation').value = app.wizard.data.presentation;
    document.getElementById('mutuallyExclusive').checked = app.wizard.data.mutuallyExclusive;
    
    Wizard.updateItems();
  }

  static updateTitle() {
    document.getElementById('wizardTitle').textContent = 
      app.wizard.mode === 'edit' ? 'Edit Feature - Multi-Step Wizard' : 'Create New Feature - Multi-Step Wizard';
  }

  static updateStepper() {
    document.querySelectorAll('.stepper-item').forEach((item, index) => {
      const step = index + 1;
      item.classList.remove('active', 'completed');
      
      if (step === app.wizard.currentStep) {
        item.classList.add('active');
      } else if (step < app.wizard.currentStep) {
        item.classList.add('completed');
      }
    });
  }

  static updateContent() {
    document.querySelectorAll('.step-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`step${app.wizard.currentStep}`).classList.add('active');

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const saveBtn = document.getElementById('saveBtn');

    prevBtn.disabled = app.wizard.currentStep === 1;
    
    if (app.wizard.currentStep === 5) {
      nextBtn.style.display = 'none';
      saveBtn.style.display = 'inline-block';
      saveBtn.textContent = app.wizard.mode === 'edit' ? '💾 Update Feature' : '✨ Create Feature';
      Wizard.updateReview();
    } else {
      nextBtn.style.display = 'inline-block';
      saveBtn.style.display = 'none';
    }

    if (app.wizard.currentStep === 4) {
      Wizard.buildLayerAssociation();
    }
  }

  static next() {
    if (Wizard.validateStep()) {
      if (app.wizard.currentStep < 5) {
        app.wizard.currentStep++;
        Wizard.updateStepper();
        Wizard.updateContent();
      }
    }
  }

  static prev() {
    if (app.wizard.currentStep > 1) {
      app.wizard.currentStep--;
      Wizard.updateStepper();
      Wizard.updateContent();
    }
  }

  static validateStep() {
    switch (app.wizard.currentStep) {
      case 1:
        app.wizard.data.featureType = document.querySelector('input[name="featureType"]:checked').value;
        return true;
      case 2:
        app.wizard.data.featureId = document.getElementById('featureId').value.trim();
        app.wizard.data.featureName = document.getElementById('featureName').value.trim();
        app.wizard.data.presentation = document.getElementById('presentation').value;
        app.wizard.data.mutuallyExclusive = document.getElementById('mutuallyExclusive').checked;
        return true;
      case 3:
        if (app.wizard.data.items.length === 0) {
          alert('Please add at least one item to the feature.');
          return false;
        }
        return true;
      case 4:
        const unlinkedItems = app.wizard.data.items.filter(item => !item.layersIds || item.layersIds.length === 0);
        if (unlinkedItems.length > 0) {
          alert(`Please associate layers with: ${unlinkedItems.map(i => i.name).join(', ')}`);
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  static addItem() {
    const name = document.getElementById('itemName').value.trim();
    if (!name) {
      alert('Please enter an item name');
      return;
    }

    const id = Utils.slug(name);
    if (app.wizard.data.items.some(item => item.id === id)) {
      alert('An item with this name already exists. Please use a different name.');
      return;
    }

    const item = {
      id: id,
      name: name,
      showLegend: document.getElementById('showLegend').checked,
      legendUrl: document.getElementById('legendUrl').value.trim() || undefined,
      legendDescription: document.getElementById('legendDescription').value.trim() || undefined,
      layersIds: []
    };

    app.wizard.data.items.push(item);
    Wizard.updateItems();
    
    // Clear form
    document.getElementById('itemName').value = '';
    document.getElementById('legendUrl').value = '';
    document.getElementById('legendDescription').value = '';
  }

  static updateItems() {
    const container = document.getElementById('itemsList');
    
    if (app.wizard.data.items.length === 0) {
      container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--muted);">No items added yet</div>';
      return;
    }
    
    container.innerHTML = '';
    
    app.wizard.data.items.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'item-row';
      
      const layerCount = item.layersIds ? item.layersIds.length : 0;
      const layerText = layerCount === 0 ? 'No layers assigned' : `${layerCount} layer(s) assigned`;
      
      itemEl.innerHTML = `
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-details">ID: <code>${item.id}</code> • Legend: ${item.showLegend ? 'Yes' : 'No'}${item.legendUrl ? ' • Custom URL' : ''}</div>
          <div class="item-layers">${layerText}</div>
        </div>
        <button class="btn danger small" onclick="Wizard.removeItem(${index})">Remove</button>
      `;
      container.appendChild(itemEl);
    });
  }

  static removeItem(index) {
    app.wizard.data.items.splice(index, 1);
    Wizard.updateItems();
  }

  static buildLayerAssociation() {
    const container = document.getElementById('layerAssociation');
    container.innerHTML = '';
    
    const availableLayers = (app.data.layers || []).map(l => l.id).sort();
    
    if (availableLayers.length === 0) {
      container.innerHTML = '<p class="muted">No layers found in JSON. Please load a file with layer definitions first.</p>';
      return;
    }
    
    app.wizard.data.items.forEach((item, itemIndex) => {
      const sectionEl = document.createElement('div');
      sectionEl.className = 'layer-section';
      
      sectionEl.innerHTML = `
        <h4>Layers for "${item.name}" (${item.id})</h4>
        <div class="layer-options">
          ${availableLayers.map(layerId => `
            <div class="layer-option">
              <input type="checkbox" id="layer_${itemIndex}_${layerId.replace(/[^a-zA-Z0-9]/g, '_')}" 
                     value="${layerId}" onchange="Wizard.toggleLayer(${itemIndex}, '${layerId}', this.checked)">
              <label for="layer_${itemIndex}_${layerId.replace(/[^a-zA-Z0-9]/g, '_')}">${layerId}</label>
            </div>
          `).join('')}
        </div>
      `;
      
      container.appendChild(sectionEl);
      
      // Pre-check already assigned layers
      if (item.layersIds) {
        item.layersIds.forEach(layerId => {
          const checkbox = document.getElementById(`layer_${itemIndex}_${layerId.replace(/[^a-zA-Z0-9]/g, '_')}`);
          if (checkbox) checkbox.checked = true;
        });
      }
    });
  }

  static toggleLayer(itemIndex, layerId, checked) {
    const item = app.wizard.data.items[itemIndex];
    if (!item.layersIds) item.layersIds = [];
    
    if (checked) {
      if (!item.layersIds.includes(layerId)) {
        item.layersIds.push(layerId);
      }
    } else {
      item.layersIds = item.layersIds.filter(id => id !== layerId);
    }
    
    Wizard.updateItems();
  }

  static updateReview() {
    const validationResults = document.getElementById('validationResults');
    const jsonPreview = document.getElementById('jsonPreview');
    
    const feature = Wizard.buildFeatureObject();
    
    // Validation
    const validationMessages = [];
    const definedLayers = new Set((app.data.layers || []).map(l => l.id));
    
    app.wizard.data.items.forEach(item => {
      if (!item.layersIds || item.layersIds.length === 0) {
        validationMessages.push({ type: 'error', message: `Item "${item.name}" has no layer associations` });
      } else {
        item.layersIds.forEach(layerId => {
          if (!definedLayers.has(layerId)) {
            validationMessages.push({ type: 'error', message: `Layer "${layerId}" referenced by "${item.name}" does not exist` });
          }
        });
      }
    });
    
    if (app.wizard.data.items.length === 0) {
      validationMessages.push({ type: 'error', message: 'Feature must have at least one item' });
    }
    
    if (app.wizard.data.featureId && app.wizard.mode === 'create') {
      const existingIds = new Set();
      [...(app.data.weatherFeatures || []), ...(app.data.features || [])].forEach(f => {
        if (f.id) existingIds.add(f.id);
      });
      if (existingIds.has(app.wizard.data.featureId)) {
        validationMessages.push({ type: 'warning', message: `Feature ID "${app.wizard.data.featureId}" already exists` });
      }
    }
    
    if (validationMessages.filter(m => m.type === 'error').length === 0) {
      validationMessages.push({ type: 'success', message: '✅ Feature validation passed! Ready to create.' });
    }
    
    validationResults.innerHTML = validationMessages.map(msg => 
      `<div class="validation-item ${msg.type}">${msg.message}</div>`
    ).join('');
    
    jsonPreview.value = JSON.stringify(feature, null, 2);
  }

  static buildFeatureObject() {
    const feature = {
      presentation: app.wizard.data.presentation,
      items: app.wizard.data.items.map(item => {
        const itemObj = {
          id: item.id,
          name: item.name,
          layersIds: item.layersIds || []
        };
        if (item.showLegend) itemObj.showLegend = true;
        if (item.legendUrl) itemObj.legendUrl = item.legendUrl;
        if (item.legendDescription) itemObj.legendDescription = item.legendDescription;
        return itemObj;
      })
    };
    
    if (app.wizard.data.featureId) feature.id = app.wizard.data.featureId;
    if (app.wizard.data.featureName) feature.name = app.wizard.data.featureName;
    if (app.wizard.data.mutuallyExclusive) feature.mutuallyExclusive = true;
    
    return feature;
  }

  static save() {
    if (!Wizard.validateStep()) return;
    
    const feature = Wizard.buildFeatureObject();
    const targetArray = app.wizard.data.featureType === 'weatherFeature' ? 'weatherFeatures' : 'features';
    app.data[targetArray] = app.data[targetArray] || [];
    
    if (app.wizard.mode === 'edit') {
      app.data[targetArray][app.wizard.editingIndex] = feature;
    } else {
      app.data[targetArray].push(feature);
    }
    
    // Add internationalization for all languages
    const languages = ['en', 'da', 'nb', 'sv'];
    app.data.intl = app.data.intl || {};
    
    languages.forEach(lang => {
      app.data.intl[lang] = app.data.intl[lang] || {};
      
      if (app.wizard.data.featureId) {
        app.data.intl[lang][app.wizard.data.featureId] = app.wizard.data.featureName || app.wizard.data.featureId;
      }
      
      app.wizard.data.items.forEach(item => {
        app.data.intl[lang][item.id] = item.name;
        if (item.legendDescription) {
          app.data.intl[lang][item.legendDescription] = item.legendDescription;
        }
      });
    });
    
    App.refresh();
    Wizard.hide();
    
    const actionText = app.wizard.mode === 'edit' ? 'Updated' : 'Created';
    ui.setStatus(`✅ ${actionText} ${app.wizard.data.featureType === 'weatherFeature' ? 'weather feature' : 'feature'} "${app.wizard.data.featureName || app.wizard.data.featureId || 'unnamed'}" with ${app.wizard.data.items.length} items`);
  }
}