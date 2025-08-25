import { ValidationResult } from '../lib/types';

interface ValidationDisplayProps {
  validation: ValidationResult | null;
  className?: string;
}

export default function ValidationDisplay({ validation, className = "" }: ValidationDisplayProps) {
  if (!validation || (validation.errors.length === 0 && validation.warnings.length === 0)) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {validation.errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-700/30 rounded p-2">
          <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-1">
            <span>❌</span>
            <span>Errors ({validation.errors.length})</span>
          </div>
          <div className="space-y-1">
            {validation.errors.map((error, index) => (
              <div key={index} className="text-red-300 text-xs">
                • {error}
              </div>
            ))}
          </div>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-2">
          <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-1">
            <span>⚠️</span>
            <span>Warnings ({validation.warnings.length})</span>
          </div>
          <div className="space-y-1">
            {validation.warnings.map((warning, index) => (
              <div key={index} className="text-yellow-300 text-xs">
                • {warning}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}