import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';

interface TreeItemProps {
  label: string;
  sublabel?: string;
  isSelected: boolean;
  level?: number;
  onClick: () => void;
  onDelete?: () => void;
  badges?: Array<{ text: string; color: string }>;
  actions?: any;
  isDragging?: boolean;
  children?: any;
  shouldExpand?: boolean;
}

export default function TreeItem({
  label,
  sublabel,
  isSelected,
  level = 0,
  onClick,
  onDelete,
  badges = [],
  actions,
  isDragging = false,
  children,
  shouldExpand
}: TreeItemProps) {
  const isExpanded = useSignal(false);
  const hasChildren = !!children;

  useEffect(() => {
    if (shouldExpand) {
      isExpanded.value = true;
    }
  }, [shouldExpand]);

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all group ${
          isSelected
            ? 'bg-blue-600 text-white'
            : 'hover:bg-slate-700 text-slate-300'
        } ${isDragging ? 'opacity-50' : ''}`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={onClick}
      >
        {hasChildren && (
          <span
            className="text-xs w-4 text-slate-400 hover:text-white"
            onClick={(e) => { e.stopPropagation(); isExpanded.value = !isExpanded.value; }}
          >
            {isExpanded.value ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="w-4" />}
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate">{label || '(unnamed)'}</div>
          {sublabel && <div className="text-xs text-slate-500 truncate">{sublabel}</div>}
        </div>
        {actions && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center" onClick={e => e.stopPropagation()}>
            {actions}
          </div>
        )}
        {badges.map((badge, i) => (
          <span key={i} className={`text-sm ${badge.color}`}>{badge.text}</span>
        ))}
        {onDelete && (
          <button
            className="text-red-400 hover:text-red-300 text-sm px-1 opacity-0 group-hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete"
          >
            ×
          </button>
        )}
      </div>
      {hasChildren && isExpanded.value && (
        <div className="ml-2">
          {children}
        </div>
      )}
    </div>
  );
}
