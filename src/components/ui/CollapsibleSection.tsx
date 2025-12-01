import { useSignal } from '@preact/signals';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  badge?: string | number;
  badgeColor?: string;
  children: any;
  actions?: any;
}

export default function CollapsibleSection({
  title,
  defaultOpen = true,
  badge,
  badgeColor = 'bg-slate-600',
  children,
  actions
}: CollapsibleSectionProps) {
  const isOpen = useSignal(defaultOpen);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden mb-3">
      <div
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 cursor-pointer hover:bg-slate-750 select-none"
        onClick={() => isOpen.value = !isOpen.value}
      >
        <span className="text-slate-400 text-xs w-4">{isOpen.value ? '▼' : '▶'}</span>
        <span className="font-medium text-sm text-slate-200 flex-1">{title}</span>
        {badge !== undefined && (
          <span className={`text-xs px-2 py-0.5 rounded ${badgeColor}`}>{badge}</span>
        )}
        {actions && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
      {isOpen.value && (
        <div className="p-3 bg-slate-900/50">
          {children}
        </div>
      )}
    </div>
  );
}
