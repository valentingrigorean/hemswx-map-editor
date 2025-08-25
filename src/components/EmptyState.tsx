import { setStatus, updateJsonData } from '../lib/jsonStore';
import { getDefaultData } from '../lib/utils';

interface EmptyStateProps {
  onOpenClick: () => void;
}

export default function EmptyState({ onOpenClick }: EmptyStateProps) {
  const handleStartEmpty = () => {
    updateJsonData(getDefaultData());
    setStatus('✅ Started with empty JSON structure');
  };

  const handlePaste = (e: ClipboardEvent) => {
    const text = e.clipboardData?.getData('text');
    if (!text) return;
    try {
      const data = JSON.parse(text);
      updateJsonData(data);
      setStatus('✅ JSON pasted from clipboard');
    } catch {
      // ignore non-JSON
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []);
    const jsonFile = files.find(f => f.type === 'application/json' || f.name.endsWith('.json'));
    if (jsonFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          try {
            const data = JSON.parse(text);
            updateJsonData(data);
            setStatus('✅ JSON file loaded successfully');
          } catch (error) {
            setStatus('❌ Invalid JSON dropped');
          }
        }
      };
      reader.readAsText(jsonFile);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]" onPaste={handlePaste as any}>
      <div
        className="w-full max-w-2xl text-center p-8 border border-dashed border-slate-600 rounded-xl bg-slate-900/40"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <h2 className="text-lg mb-2 text-slate-100">Get Started</h2>
        <p className="mb-4 text-slate-400">Choose an option to begin</p>
        <div className="flex flex-col gap-2 items-center">
          <button className="btn primary" onClick={handleStartEmpty}>Start with Empty Structure</button>
          <button className="btn" onClick={onOpenClick}>Open Existing JSON…</button>
        </div>
        <div className="mt-4 text-xs text-slate-500">Tip: You can also drop JSON files here or paste JSON</div>
      </div>
    </div>
  );
}
