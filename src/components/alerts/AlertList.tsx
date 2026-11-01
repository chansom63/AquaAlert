import type { FC } from 'react';
import { date } from '../../api/client';
import type { Alert, Source } from '../../types/water';

const AlertList: FC<{ alerts: Alert[]; sources: Source[]; onSelect: (a: Alert) => void }> = ({ alerts, sources, onSelect }) =>
  alerts.length ? (
    <div>
      {alerts.map(a => (
        <article className="notice-item" key={a.alertId}>
          <span className="notice-icon">!</span>
          <div>
            <b>{a.publicMessage || a.reason || 'Water quality screening alert'}</b>
            <p>
              {sources.find(s => s.sourceId === a.sourceId)?.name || a.sourceId} · {date(a.issuedAt)}
            </p>
            <small>
              {a.severity || 'NOTICE'} · {a.state || 'OPEN'} · {a.alertId}
            </small>
          </div>
          <button className="row-action" onClick={() => onSelect(a)}>
            View →
          </button>
        </article>
      ))}
    </div>
  ) : (
    <p className="empty-state">No alerts returned.</p>
  );

export default AlertList;
