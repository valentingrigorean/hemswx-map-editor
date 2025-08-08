import { useSignal, useComputed } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { setStatus } from '../lib/jsonStore';
import { debounce, safeParse } from '../lib/utils';

interface SubEditorProps<T> {
  title?: string;
  value: T | null;
  onChange: (next: T) => void;
  placeholder?: string;
}

export default function SubEditor<T>({ title, value, onChange, placeholder }: SubEditorProps<T>) {
  const editorText = useSignal<string>('');
  const validationErrors = useSignal<string[]>([]);
  const isUserTyping = useSignal(false);

  // keep local text in sync with incoming value when not typing
  useEffect(() => {
    if (!isUserTyping.value) {
      editorText.value = value != null ? JSON.stringify(value, null, 2) : '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value as any]);

  const debouncedApply = debounce((text: string) => {
    if (text.trim() === '') {
      validationErrors.value = ['Empty JSON is not allowed'];
      isUserTyping.value = false;
      return;
    }
    const [parsed, err] = safeParse(text);
    if (err || parsed === undefined) {
      validationErrors.value = [err?.message || 'Invalid JSON'];
      setStatus(`❌ Invalid JSON: ${err?.message || 'Parse error'}`);
    } else {
      try {
        onChange(parsed as T);
        validationErrors.value = [];
        setStatus('✅ Section updated');
      } catch (e) {
        validationErrors.value = ['Failed to apply changes'];
        setStatus('❌ Failed to apply changes');
      }
    }
    isUserTyping.value = false;
  }, 800);

  const handleChange = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    editorText.value = target.value;
    isUserTyping.value = true;
    debouncedApply(target.value);
  };

  const hasErrors = useComputed(() => validationErrors.value.length > 0);

  if (value == null) {
    return (
      <div className="text-center text-slate-500 p-4">
        {placeholder || 'Select an item to edit its JSON'}
      </div>
    );
  }

  return (
    <div>
      {title && (
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          <span className="text-slate-500">{title}</span>
        </div>
      )}
      <textarea
        className={hasErrors.value ? 'json-editor border-red-500' : 'json-editor'}
        value={editorText.value}
        onInput={handleChange}
        spellcheck={false}
      />
      {validationErrors.value.length > 0 && (
        <div className="mt-2 p-2 bg-red-500 text-white rounded text-xs">
          <strong>Validation Errors:</strong>
          <ul className="mt-1 ml-4 p-0">
            {validationErrors.value.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

