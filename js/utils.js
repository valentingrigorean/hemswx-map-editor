const Utils = {
  slug: s => s.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''),
  
  safeParse: (text) => {
    try { return [JSON.parse(text), null]; }
    catch (e) { return [null, e.message]; }
  },

  collectItemIds: (data) => {
    const ids = new Set();
    const add = (x) => { if (x && typeof x === 'string') ids.add(x); };
    const scanGroupArr = (arr) => {
      for (const g of arr||[]) {
        if (g.id) add(g.id);
        for (const it of g.items||[]) {
          if (it.id) add(it.id);
          if (it.legendDescription) add(it.legendDescription);
        }
      }
    };
    scanGroupArr(data.weatherFeatures);
    scanGroupArr(data.features);
    return ids;
  },

  collectReferencedLayerIds: (data) => {
    const used = new Set();
    const scan = (arr) => {
      for (const g of arr||[]) {
        for (const it of g.items||[]) {
          for (const lid of it.layersIds||[]) used.add(lid);
        }
      }
    };
    scan(data.weatherFeatures);
    scan(data.features);
    return used;
  }
};