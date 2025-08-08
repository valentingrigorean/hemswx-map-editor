class App {
  static refresh() {
    ui.refreshEditor(app.data);
    ui.updateSummary(app.data);
    ui.updateStats(app.data);
    FeatureBrowser.update(app.data);
    IntlStatus.update(app.data);
  }

  static loadFromText(text) {
    const [obj, err] = Utils.safeParse(text);
    if (err) { 
      ui.setStatus('Parse error: ' + err); 
      return; 
    }
    app.data = obj;
    App.refresh();
    ui.setStatus('Loaded JSON.');
  }

  static syncTranslations() {
    const [obj, err] = Utils.safeParse(ui.editor.value);
    if (err) { 
      ui.setStatus('❌ Invalid JSON: ' + err); 
      return; 
    }
    app.data = obj;

    const en = (app.data.intl.en || {});
    const fallback = {};
    const addFallback = (id, display) => { if (!fallback[id] && display) fallback[id] = display; };

    const scanGroupArr = (arr) => {
      for (const g of arr||[]) {
        if (g.id && g.name) addFallback(g.id, g.name);
        for (const it of g.items||[]) {
          if (it.id && it.name) addFallback(it.id, it.name);
          if (it.legendDescription) addFallback(it.legendDescription, en[it.legendDescription] || it.legendDescription);
        }
      }
    };
    scanGroupArr(app.data.weatherFeatures);
    scanGroupArr(app.data.features);

    const allKeys = new Set([...Utils.collectItemIds(app.data)]);
    app.data.intl = app.data.intl || { en:{} };
    
    const languages = ['en', 'da', 'nb', 'sv'];
    languages.forEach(lang => {
      app.data.intl[lang] = app.data.intl[lang] || {};
      for (const k of allKeys) {
        if (!(k in app.data.intl[lang])) {
          app.data.intl[lang][k] = (en[k]) || fallback[k] || k;
        }
      }
    });

    App.refresh();
    ui.setStatus('✅ Filled missing translations for all languages.');
  }

  static pruneUnused() {
    const [obj, err] = Utils.safeParse(ui.editor.value);
    if (err) { 
      ui.setStatus('❌ Invalid JSON: ' + err); 
      return; 
    }
    app.data = obj;

    const usedLayerIds = Utils.collectReferencedLayerIds(app.data);
    app.data.layers = (app.data.layers||[]).filter(l => usedLayerIds.has(l.id));

    const keys = Utils.collectItemIds(app.data);
    for (const lang of Object.keys(app.data.intl||{})) {
      const dict = app.data.intl[lang];
      for (const k of Object.keys(dict)) {
        if (!keys.has(k)) delete dict[k];
      }
    }

    App.refresh();
    ui.setStatus('🧹 Removed unreferenced layers and intl keys.');
  }

  static download() {
    const [obj, err] = Utils.safeParse(ui.editor.value);
    if (err) { 
      ui.setStatus('❌ Fix JSON before downloading: ' + err); 
      return; 
    }
    const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'map_layers.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

// Initialize Application
const app = new AppState();
const ui = new UIController();

// Event Listeners
document.getElementById('loadBtn').onclick = () => document.getElementById('fileInput').click();
document.getElementById('fileInput').addEventListener('change', e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => App.loadFromText(reader.result);
  reader.readAsText(file);
});

const dropzone = document.getElementById('dropzone');
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.style.borderColor = '#3a4460'; });
dropzone.addEventListener('dragleave', e => { dropzone.style.borderColor = '#2a3145'; });
dropzone.addEventListener('drop', e => {
  e.preventDefault(); dropzone.style.borderColor = '#2a3145';
  const file = e.dataTransfer.files?.[0];
  if (file) {
    const r = new FileReader(); r.onload = () => App.loadFromText(r.result); r.readAsText(file);
  } else {
    const text = e.dataTransfer.getData('text/plain'); 
    if (text) App.loadFromText(text);
  }
});
dropzone.onclick = () => document.getElementById('fileInput').click();

document.getElementById('validateBtn').onclick = () => {
  const [obj, err] = Utils.safeParse(ui.editor.value);
  if (err) { ui.setStatus('❌ Invalid JSON: ' + err); return; }
  ui.setStatus('✅ JSON is valid.');
};

document.getElementById('formatBtn').onclick = () => {
  const [obj, err] = Utils.safeParse(ui.editor.value);
  if (err) { ui.setStatus('❌ Invalid JSON: ' + err); return; }
  ui.editor.value = JSON.stringify(obj, null, 2);
  ui.setStatus('Formatted.');
};

document.getElementById('syncIntlBtn').onclick = App.syncTranslations;
document.getElementById('pruneBtn').onclick = App.pruneUnused;
document.getElementById('downloadBtn').onclick = App.download;
document.getElementById('createFeatureBtn').onclick = () => Wizard.show('create');

// Wizard Event Listeners
document.getElementById('nextBtn').onclick = Wizard.next;
document.getElementById('prevBtn').onclick = Wizard.prev;
document.getElementById('saveBtn').onclick = Wizard.save;
document.getElementById('cancelBtn').onclick = Wizard.hide;
document.getElementById('addItemToList').onclick = Wizard.addItem;

// Main tab switching
document.addEventListener('click', (e) => {
  // Handle main tabs
  if (e.target.classList.contains('main-tab-btn')) {
    document.querySelectorAll('.main-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.main-tab-content').forEach(content => content.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById(e.target.dataset.tab + 'Tab').classList.add('active');
  }
  
  // Handle internationalization sub-tabs
  if (e.target.classList.contains('intl-tab-btn')) {
    document.querySelectorAll('.intl-tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    IntlStatus.show(e.target.dataset.lang, app.data);
  }
});

// Keep data in sync with manual edits
ui.editor.addEventListener('input', () => {
  const [obj, err] = Utils.safeParse(ui.editor.value);
  if (!err && obj) { 
    app.data = obj; 
    ui.updateSummary(app.data);
    ui.updateStats(app.data);
    FeatureBrowser.update(app.data);
    IntlStatus.update(app.data);
  }
});

// Initialize
App.refresh();