import type { FC } from 'react';
import type { Source } from '../../types/water';
import { MapExplorer } from '../MapExplorer';

const InteractiveMapPanel: FC<{ sources: Source[]; selectedSourceId: string; onSelectSource: (sourceId: string) => void }> = ({
  sources,
  selectedSourceId,
  onSelectSource,
}) => (
  <section className="portal-panel interactive-map-panel" style={{ padding: '20px' }}>
    <div className="panel-heading" style={{ marginBottom: '16px' }}>
      <div>
        <div className="panel-eyebrow">GEOSPATIAL INTELLIGENCE · GWALIOR</div>
        <h2>GMC 66 Wards &amp; Water Surveillance Map</h2>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span className="demo-pill">KEYLESS ESRI &amp; GIS</span>
        <span className="demo-pill" style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}>
          66 WARDS MAPPED
        </span>
      </div>
    </div>
    <MapExplorer sources={sources} selectedSourceId={selectedSourceId} onSelectSource={onSelectSource} />
  </section>
);

export default InteractiveMapPanel;
