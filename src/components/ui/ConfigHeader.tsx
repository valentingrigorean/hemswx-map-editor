import { h, ComponentChildren } from 'preact';

interface ConfigHeaderProps {
  title: string;
  id?: string;
  isNew?: boolean;
  showPreview?: boolean;
  onTogglePreview?: () => void;
  // Note: Form/JSON Toggle is requested, but for now we might just support visual or a prop
  // If we had a view mode state, we'd pass it here.
  // For now I will add a placeholder or simple toggle if needed, 
  // but based on request: "[Form/JSON Toggle] in the center"
  // Since I don't control the parent's view state for JSON yet, I'll add the prop.
  viewMode?: 'form' | 'json';
  onViewModeChange?: (mode: 'form' | 'json') => void;
  
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
}

export default function ConfigHeader({
  title,
  id,
  isNew,
  showPreview,
  onTogglePreview,
  viewMode = 'form',
  onViewModeChange,
  onSave,
  onCancel,
  onDelete,
  saveLabel = 'Save',
  cancelLabel
}: ConfigHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
      {/* Left: Title/ID */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <h2 className="text-lg font-medium text-white truncate pr-2">
            {title}
          </h2>
          {!isNew && id && (
            <div className="text-xs text-slate-400 mt-0.5 truncate font-mono">
              ID: {id}
            </div>
          )}
        </div>
      </div>

      {/* Center: View Toggle & Preview */}
      <div className="flex items-center gap-3">
        {onViewModeChange && (
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700">
            <button
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'form'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => onViewModeChange('form')}
            >
              Form
            </button>
            <button
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'json'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => onViewModeChange('json')}
            >
              JSON
            </button>
          </div>
        )}

        {onTogglePreview && (
          <button
            className={`px-3 py-1 rounded text-xs transition-colors border ${
              showPreview
                ? 'bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            onClick={onTogglePreview}
            title={showPreview ? 'Hide map preview' : 'Show map preview'}
          >
            {showPreview ? 'Preview On' : 'Preview Off'}
          </button>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex gap-2">
        {isNew ? (
          <>
            {onSave && <button className="btn success small" onClick={onSave}>Create</button>}
            {onCancel && <button className="btn ghost small" onClick={onCancel}>{cancelLabel || 'Cancel'}</button>}
          </>
        ) : (
          <>
            {onSave && <button className="btn primary small" onClick={onSave}>{saveLabel}</button>}
            {/* Only show Cancel/Revert if explicit label is provided (e.g. Back) */}
            {onCancel && cancelLabel && <button className="btn ghost small" onClick={onCancel}>{cancelLabel}</button>}
            {onDelete && <button className="btn danger small" onClick={onDelete}>Delete</button>}
          </>
        )}
      </div>
    </div>
  );
}
