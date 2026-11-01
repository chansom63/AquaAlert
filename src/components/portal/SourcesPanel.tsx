import type { FC } from 'react';
import { date } from '../../api/client';
import type { Reading, Source } from '../../types/water';
import ReadingCard from '../readings/ReadingCard';
import SourceTable from '../sources/SourceTable';
import Status from '../sources/Status';

type SourcesPanelProps = {
  admin: boolean;
  loading: boolean;
  sources: Source[];
  areas: string[];
  area: string;
  query: string;
  selectedSource?: Source;
  readings: Reading[];
  onAreaChange: (area: string) => void;
  onQueryChange: (query: string) => void;
  onSelect: (sourceId: string) => void;
};

const SourcesPanel: FC<SourcesPanelProps> = ({
  admin,
  loading,
  sources,
  areas,
  area,
  query,
  selectedSource,
  readings,
  onAreaChange,
  onQueryChange,
  onSelect,
}) => (
  <section className="portal-panel">
    <div className="panel-heading">
      <div>
        <div className="panel-eyebrow">SOURCE REGISTRY · GWALIOR</div>
        <h2>{admin ? 'Monitoring points' : 'Public water sources'}</h2>
      </div>
      <div className="source-filters">
        <select aria-label="Filter by Gwalior area" value={area} onChange={e => onAreaChange(e.target.value)}>
          {areas.map(a => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <input className="search-input" placeholder="Search source or ward" value={query} onChange={e => onQueryChange(e.target.value)} />
      </div>
    </div>
    {loading ? <p className="empty-state">Loading sources…</p> : <SourceTable sources={sources} admin={admin} onSelect={s => onSelect(s.sourceId)} />}
    <div className="detail-grid">
      <div>
        <div className="panel-eyebrow">SELECTED SOURCE</div>
        <h3>{selectedSource?.name || selectedSource?.sourceId || 'Choose a source'}</h3>
        <p>
          {selectedSource?.district || 'Gwalior'} · ID {selectedSource?.sourceId || '—'}
        </p>
        <p>
          Status: <Status value={selectedSource?.publicStatus || 'UNKNOWN'} />
        </p>
        <p>Last reading: {date(selectedSource?.lastReadingAt)}</p>
        {selectedSource?.latitude && (
          <p>
            Coordinates: {selectedSource.latitude}, {selectedSource.longitude}
          </p>
        )}
      </div>
      <div>
        <div className="panel-eyebrow">LATEST READINGS</div>
        {readings.length ? (
          readings.slice(0, 5).map(r => <ReadingCard key={r.readingId} reading={r} />)
        ) : (
          <p className="empty-state">No readings returned. Missing data is unknown, not a safe result.</p>
        )}
      </div>
    </div>
  </section>
);

export default SourcesPanel;
