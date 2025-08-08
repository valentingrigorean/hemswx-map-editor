import { jsonData, syncMissingTranslations, pruneUnused, setStatus } from '../lib/jsonStore';
import { formatJSON, validateJSON } from '../lib/parse';
import { downloadBlob } from '../lib/utils';

export default function Toolbar() {
  const handleValidate = () => {
    const validation = validateJSON(JSON.stringify(jsonData.value));
    if (validation.valid) {
      setStatus('✅ JSON is valid');
    } else {
      setStatus(`❌ Validation failed: ${validation.errors.length} error(s), ${validation.warnings.length} warning(s)`);
    }
  };

  const handleFormat = () => {
    try {
      const formatted = formatJSON(jsonData.value);
      // The formatted JSON will be reflected in the editor through signals
      setStatus('✅ JSON formatted');
    } catch (error) {
      setStatus('❌ Could not format JSON');
    }
  };

  const handleDownload = () => {
    try {
      const jsonString = JSON.stringify(jsonData.value, null, 2);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      downloadBlob(`map-layers-${timestamp}.json`, jsonString);
      setStatus('✅ JSON file downloaded');
    } catch (error) {
      setStatus('❌ Download failed');
    }
  };

  const handleFixTranslations = () => {
    syncMissingTranslations();
  };

  const handleRemoveUnused = () => {
    pruneUnused();
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button className="btn" onClick={handleValidate}>
        Validate
      </button>
      <button className="btn" onClick={handleFormat}>
        Format
      </button>
      <button className="btn" onClick={handleFixTranslations}>
        Fix Missing Translations
      </button>
      <button className="btn" onClick={handleRemoveUnused}>
        Remove Unused
      </button>
      <button className="btn success" onClick={handleDownload}>
        Download JSON
      </button>
    </div>
  );
}