import type { PreviewMode, CustomLegend } from './types';

interface LegendPanelProps {
  mode: PreviewMode;
  customLegends: CustomLegend[];
  mapElementRef: React.RefObject<any>;
  viewReady: boolean;
  onClose: () => void;
}

export function LegendPanel({
  mode,
  customLegends,
  mapElementRef,
  viewReady,
  onClose
}: LegendPanelProps) {
  return (
    <calcite-panel
      heading="Legend"
      closable
      onCalcitePanelClose={(e: any) => { e.stopPropagation(); onClose(); }}
      style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        width: '280px',
        maxHeight: 'calc(100% - 16px)',
        zIndex: 20,
        overflow: 'auto'
      }}
    >
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mode === 'layer' && (
          <arcgis-legend
            ref={(el: any) => {
              if (el && viewReady) {
                el.view = mapElementRef.current?.view;
              }
            }}
          />
        )}
        {customLegends.map((legend, idx) => (
          <calcite-card key={idx}>
            <span slot="title">{legend.name}</span>
            {legend.description && <span slot="subtitle">{legend.description}</span>}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '4px',
              padding: '4px',
              marginTop: '8px'
            }}>
              <img
                src={legend.url}
                alt={`Legend for ${legend.name}`}
                style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          </calcite-card>
        ))}
      </div>
    </calcite-panel>
  );
}
