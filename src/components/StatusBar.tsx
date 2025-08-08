import { useComputed } from '@preact/signals';
import { dataStats } from '../lib/jsonStore';

export default function StatusBar() {
  const stats = useComputed(() => dataStats.value);

  const missingLayersCount = stats.value.missingLayers.length;
  const unusedLayersCount = stats.value.unusedLayers.length;
  const missingIntlCounts = Object.entries(stats.value.missingIntl)
    .map(([lang, keys]) => ({ lang, count: keys.length }))
    .filter(item => item.count > 0);

  if (!missingLayersCount && !unusedLayersCount && missingIntlCounts.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'var(--panel)',
      borderTop: '1px solid var(--border)',
      padding: '8px 12px',
      fontSize: '12px',
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      zIndex: 10
    }}>
      {missingLayersCount > 0 && (
        <span className={`pill ${missingLayersCount > 0 ? 'bad' : 'ok'}`}>
          Missing layers: {missingLayersCount}
        </span>
      )}
      
      {unusedLayersCount > 0 && (
        <span className={`pill ${unusedLayersCount > 0 ? 'warn' : 'ok'}`}>
          Unused layers: {unusedLayersCount}
        </span>
      )}
      
      {missingIntlCounts.map(({ lang, count }) => (
        <span key={lang} className={`pill ${count > 0 ? 'warn' : 'ok'}`}>
          {lang} missing: {count}
        </span>
      ))}

      {stats.value.missingLayers.length > 0 && (
        <div className="muted" style={{ fontSize: '10px' }}>
          Missing: {stats.value.missingLayers.join(', ')}
        </div>
      )}
      
      {stats.value.unusedLayers.length > 0 && (
        <div className="muted" style={{ fontSize: '10px' }}>
          Unused: {stats.value.unusedLayers.join(', ')}
        </div>
      )}
    </div>
  );
}