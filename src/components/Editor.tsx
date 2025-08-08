import { useSignal, useComputed } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { jsonData, jsonText, updateJsonData, setStatus } from '../lib/jsonStore';
import { validateJSON } from '../lib/parse';
import { safeParse, debounce } from '../lib/utils';

export default function Editor() {
  const editorText = useSignal(jsonText.value);
  const validationErrors = useSignal<string[]>([]);

  // Update editor when store changes (but not when user is typing)
  const isUserTyping = useSignal(false);
  
  useEffect(() => {
    if (!isUserTyping.value) {
      editorText.value = jsonText.value;
    }
  }, [jsonText.value]);

  // Debounced validation and sync
  const debouncedUpdate = debounce((text: string) => {
    const validation = validateJSON(text);
    validationErrors.value = validation.errors;
    
    if (validation.valid) {
      const [parsed] = safeParse(text);
      if (parsed) {
        updateJsonData(parsed);
        setStatus('✅ JSON updated');
      }
    } else {
      setStatus(`❌ JSON validation failed: ${validation.errors[0]}`);
    }
    
    isUserTyping.value = false;
  }, 1000);

  const handleChange = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    const text = target.value;
    editorText.value = text;
    isUserTyping.value = true;
    debouncedUpdate(text);
  };

  // Handle file drop
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []);
    const jsonFile = files.find(f => f.type === 'application/json' || f.name.endsWith('.json'));
    
    if (jsonFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          editorText.value = text;
          isUserTyping.value = true;
          debouncedUpdate(text);
        }
      };
      reader.readAsText(jsonFile);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  // Handle paste
  const handlePaste = (e: ClipboardEvent) => {
    const text = e.clipboardData?.getData('text');
    if (text) {
      try {
        // Validate that it's JSON
        JSON.parse(text);
        editorText.value = text;
        isUserTyping.value = true;
        debouncedUpdate(text);
        setStatus('✅ JSON pasted from clipboard');
      } catch (error) {
        // If not valid JSON, let default paste behavior handle it
      }
    }
  };

  const hasErrors = useComputed(() => validationErrors.value.length > 0);

  return (
    <div>
      <textarea
        className={`json-editor ${hasErrors.value ? 'error' : ''}`}
        value={editorText.value}
        onInput={handleChange}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onPaste={handlePaste}
        placeholder="Paste JSON or drop a file…"
        spellcheck={false}
        style={{
          borderColor: hasErrors.value ? 'var(--bad)' : undefined
        }}
      />
      
      {validationErrors.value.length > 0 && (
        <div style={{ 
          marginTop: '8px', 
          padding: '8px', 
          background: 'var(--bad)', 
          color: 'white', 
          borderRadius: '6px',
          fontSize: '12px'
        }}>
          <strong>Validation Errors:</strong>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            {validationErrors.value.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}