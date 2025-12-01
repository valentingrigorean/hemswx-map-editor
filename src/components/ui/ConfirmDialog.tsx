import { useSignal } from '@preact/signals';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-orange-600 hover:bg-orange-700',
    default: 'bg-blue-600 hover:bg-blue-700'
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
      onClick={onCancel}
    >
      <div
        className="bg-slate-800 border border-slate-600 rounded-xl w-[400px] max-w-[90vw] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-medium text-white">{title}</h3>
        </div>
        <div className="p-4">
          <p className="text-slate-300">{message}</p>
        </div>
        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`px-4 py-2 rounded text-white text-sm transition-colors ${variantStyles[variant]}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface UseConfirmDialogReturn {
  isOpen: { value: boolean };
  config: { value: ConfirmConfig | null };
  confirm: (config: ConfirmConfig) => void;
  handleConfirm: () => void;
  handleCancel: () => void;
}

interface ConfirmConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
}

export function useConfirmDialog(): UseConfirmDialogReturn {
  const isOpen = useSignal(false);
  const config = useSignal<ConfirmConfig | null>(null);

  const confirm = (newConfig: ConfirmConfig) => {
    config.value = newConfig;
    isOpen.value = true;
  };

  const handleConfirm = () => {
    config.value?.onConfirm();
    isOpen.value = false;
    config.value = null;
  };

  const handleCancel = () => {
    isOpen.value = false;
    config.value = null;
  };

  return { isOpen, config, confirm, handleConfirm, handleCancel };
}
