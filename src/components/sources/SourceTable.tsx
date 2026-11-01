import type { FC } from 'react';
import { date } from '../../api/client';
import type { Source } from '../../types/water';
import Status from './Status';

const SourceTable: FC<{ sources: Source[]; admin: boolean; onSelect: (s: Source) => void }> = ({ sources, admin, onSelect }) =>
  sources.length ? (
    <div className="source-list">
      {sources.map(s => (
        <article className="source-row" key={s.sourceId}>
          <div className="source-main">
            <span className="source-dot" />
            <div>
              <h3>{s.name || s.sourceId}</h3>
              <p>
                {s.district || s.locality || 'Location not provided'} · {s.sourceId}
              </p>
            </div>
          </div>
          <div className="source-status">
            <Status value={s.publicStatus || 'UNKNOWN'} />
          </div>
          <div className="source-values">
            <div>
              <span>Last sample</span>
              <b>{date(s.lastReadingAt)}</b>
            </div>
            <div>
              <span>Data label</span>
              <b>{s.isDemo ? 'DEMO' : 'API record'}</b>
            </div>
          </div>
          <button className="row-action" onClick={() => onSelect(s)}>
            {admin ? 'Review →' : 'Details →'}
          </button>
        </article>
      ))}
    </div>
  ) : (
    <p className="empty-state">No source records returned.</p>
  );

export default SourceTable;
