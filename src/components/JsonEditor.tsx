import { useEffect, useRef } from 'preact/hooks';
import { useComputed, useSignal } from '@preact/signals';
import Editor from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';

interface JsonEditorProps {
  title?: string;
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  readOnly?: boolean;
  height?: string;
}

export default function JsonEditor({ 
  title = 'JSON Editor', 
  value, 
  onChange, 
  placeholder = '{}',
  readOnly = false,
  height = '400px'
}: JsonEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const isValidJson = useSignal(true);
  const errorMessage = useSignal<string>('');
  const isFormatting = useSignal(false);

  // Detect macOS for keyboard shortcuts display
  const isMac = useComputed(() => {
    return typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  });

  const cmdKey = useComputed(() => isMac.value ? 'Cmd' : 'Ctrl');

  // Custom replacer to ensure opacity values are displayed as decimals
  const opacityReplacer = (key: string, value: any) => {
    // For opacity fields, ensure they are formatted as decimals
    if (key === 'opacity' && typeof value === 'number') {
      // Return as string to preserve decimal formatting
      return parseFloat(value.toFixed(1));
    }
    return value;
  };

  // Convert value to formatted JSON string
  const jsonString = useComputed(() => {
    try {
      if (value === null || value === undefined) {
        return '';
      }
      // Use custom replacer for consistent opacity formatting
      const jsonStr = JSON.stringify(value, opacityReplacer, 2);
      // Post-process to ensure opacity values show as decimals
      return jsonStr.replace(/"opacity":\s*(\d+)(?!\.)/g, '"opacity": $1.0');
    } catch (error) {
      return '';
    }
  });

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure JSON validation
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [],
      enableSchemaRequest: false,
    });

    // Set editor options for better JSON editing
    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: 12,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'on',
      lineNumbers: 'on',
      folding: true,
      bracketPairColorization: { enabled: true },
      autoIndent: 'full',
      formatOnPaste: true,
      formatOnType: true,
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      formatJson();
    });
  };

  const handleChange = (newValue: string | undefined) => {
    if (readOnly || !newValue) return;

    try {
      const parsed = JSON.parse(newValue);
      isValidJson.value = true;
      errorMessage.value = '';
      onChange(parsed);
    } catch (error) {
      isValidJson.value = false;
      errorMessage.value = error instanceof Error ? error.message : 'Invalid JSON';
      // Don't call onChange for invalid JSON to prevent corrupting the data
    }
  };

  const handleSave = () => {
    if (!editorRef.current || readOnly) return;
    
    const currentValue = editorRef.current.getValue();
    handleChange(currentValue);
  };

  const formatJson = async () => {
    if (!editorRef.current || !monacoRef.current || readOnly) return;

    isFormatting.value = true;

    try {
      // Get current value and try to parse/format it
      const currentValue = editorRef.current.getValue();
      const parsed = JSON.parse(currentValue);
      // Use the same formatting logic as jsonString
      const jsonStr = JSON.stringify(parsed, opacityReplacer, 2);
      const formatted = jsonStr.replace(/"opacity":\s*(\d+)(?!\.)/g, '"opacity": $1.0');

      // Set the formatted value
      editorRef.current.setValue(formatted);

      // Trigger the change handler
      onChange(parsed);

      isValidJson.value = true;
      errorMessage.value = '';
    } catch (error) {
      // If formatting fails, just run Monaco's built-in formatter
      await editorRef.current.getAction('editor.action.formatDocument')?.run();
    } finally {
      isFormatting.value = false;
    }
  };

  const validateJson = () => {
    if (!editorRef.current) return;
    
    const currentValue = editorRef.current.getValue();
    try {
      JSON.parse(currentValue);
      isValidJson.value = true;
      errorMessage.value = '';
      return true;
    } catch (error) {
      isValidJson.value = false;
      errorMessage.value = error instanceof Error ? error.message : 'Invalid JSON';
      return false;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex flex-wrap gap-2 mb-3 items-center flex-shrink-0">
        <span className="text-slate-500">{title}</span>
        <div className="ml-auto flex gap-2">
          {!readOnly && (
            <>
              <button
                className="btn small"
                onClick={validateJson}
                title="Validate JSON"
              >
                Validate
              </button>
              <button
                className="btn small"
                onClick={formatJson}
                disabled={isFormatting.value}
                title={`Format JSON (${cmdKey.value}+Shift+F)`}
              >
                {isFormatting.value ? 'Formatting...' : 'Format'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status indicator */}
      {!isValidJson.value && errorMessage.value && (
        <div className="bg-red-900/30 border border-red-500/50 rounded p-2 mb-2 flex-shrink-0">
          <div className="text-red-300 text-xs">
            <span className="font-medium">JSON Error:</span> {errorMessage.value}
          </div>
        </div>
      )}

      {isValidJson.value && !readOnly && (
        <div className="bg-green-900/30 border border-green-500/50 rounded p-2 mb-2 flex-shrink-0">
          <div className="text-green-300 text-xs">
            ✓ Valid JSON - Press {cmdKey.value}+S to save changes
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0 border border-slate-600 rounded overflow-hidden">
        <Editor
          height={height}
          language="json"
          theme="vs-dark"
          value={jsonString.value || placeholder}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly: readOnly,
            contextmenu: true,
            automaticLayout: true,
          }}
          loading={<div className="flex items-center justify-center h-full text-slate-400">Loading JSON Editor...</div>}
        />
      </div>

      {/* Help text */}
      <div className="text-xs text-slate-500 mt-2 flex-shrink-0">
        {readOnly ? (
          'Read-only JSON view'
        ) : (
          <>
            <span className="font-medium">Shortcuts:</span> {cmdKey.value}+S to save • {cmdKey.value}+Shift+F to format • Auto-validation enabled
          </>
        )}
      </div>
    </div>
  );
}