class UIController {
  constructor() {
    this.statusEl = document.getElementById('status');
    this.quickSummary = document.getElementById('quickSummary');
    this.statsEl = document.getElementById('stats');
    this.editor = document.getElementById('editor');
  }

  setStatus(msg) {
    this.statusEl.textContent = msg;
  }

  updateSummary(data) {
    const wf = data.weatherFeatures?.length || 0;
    const f = data.features?.length || 0;
    const ly = data.layers?.length || 0;
    const langs = Object.keys(data.intl||{}).length;
    this.quickSummary.textContent = `WF: ${wf} • F: ${f} • Layers: ${ly} • Langs: ${langs}`;
  }

  updateStats(data) {
    try {
      const usedLayers = Utils.collectReferencedLayerIds(data);
      const definedLayers = new Set((data.layers||[]).map(x=>x.id));
      const missingLayers = [...usedLayers].filter(x=>!definedLayers.has(x));
      const unusedLayers = [...definedLayers].filter(x=>!usedLayers.has(x));

      const keys = Utils.collectItemIds(data);
      const langs = Object.keys(data.intl||{});
      let missingIntl = {};
      for (const lang of langs) {
        const dict = data.intl[lang]||{};
        missingIntl[lang] = [...keys].filter(k=>!(k in dict));
      }

      const pills = [];
      pills.push(`<span class="pill ${missingLayers.length? 'bad':'ok'}">Missing layers: ${missingLayers.length}</span>`);
      pills.push(`<span class="pill ${unusedLayers.length? 'warn':'ok'}">Unused layers: ${unusedLayers.length}</span>`);
      for (const [lang, arr] of Object.entries(missingIntl)) {
        pills.push(`<span class="pill ${arr.length? 'warn':'ok'}">${lang} missing: ${arr.length}</span>`);
      }
      this.statsEl.innerHTML = pills.join(' ')
        + (missingLayers.length? `<div class="muted">Missing: ${missingLayers.join(', ')}</div>` : '')
        + (unusedLayers.length? `<div class="muted">Unused: ${unusedLayers.join(', ')}</div>` : '');
    } catch (e){ console.warn(e); }
  }

  refreshEditor(data) {
    this.editor.value = JSON.stringify(data, null, 2);
  }
}