class IntlStatus {
  static update(data) {
    const currentLang = document.querySelector('.intl-tab-btn.active')?.dataset.lang || 'en';
    IntlStatus.show(currentLang, data);
  }

  static show(lang, data) {
    const container = document.getElementById('intlTabContent');
    const expectedKeys = Utils.collectItemIds(data);
    const actualKeys = new Set(Object.keys(data.intl?.[lang] || {}));
    
    const missingKeys = [...expectedKeys].filter(key => !actualKeys.has(key));
    const extraKeys = [...actualKeys].filter(key => !expectedKeys.has(key));
    const goodKeys = [...expectedKeys].filter(key => actualKeys.has(key));
    
    let content = '<div class="intl-status">';
    content += `<div class="intl-summary good">✅ ${goodKeys.length} keys translated</div>`;
    
    if (missingKeys.length > 0) {
      content += `<div class="intl-summary missing">❌ ${missingKeys.length} missing translations</div>`;
      content += '<div class="intl-key-list">';
      missingKeys.forEach(key => {
        content += `<div class="intl-key-item">"${key}"</div>`;
      });
      content += '</div>';
    }
    
    if (extraKeys.length > 0) {
      content += `<div class="intl-summary extra">⚠️ ${extraKeys.length} unused translations</div>`;
      content += '<div class="intl-key-list">';
      extraKeys.forEach(key => {
        content += `<div class="intl-key-item">"${key}"</div>`;
      });
      content += '</div>';
    }
    
    if (missingKeys.length === 0 && extraKeys.length === 0) {
      content += '<div class="intl-summary good">🎉 All translations are up to date!</div>';
    }
    
    content += '</div>';
    container.innerHTML = content;
  }
}