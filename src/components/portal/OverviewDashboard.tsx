import type { FC } from 'react';
import { API } from '../../api/client';
import type { Alert, Source } from '../../types/water';
import AlertList from '../alerts/AlertList';
import SourceTable from '../sources/SourceTable';

type OverviewDashboardProps = {
  admin: boolean;
  loading: boolean;
  sources: Source[];
  alerts: Alert[];
  readingsCount: number;
  onOpenSources: () => void;
  onOpenAlerts: () => void;
  onSelectSource: (sourceId: string) => void;
  onSelectAlert: (sourceId: string) => void;
};

const OverviewDashboard: FC<OverviewDashboardProps> = ({
  admin,
  loading,
  sources,
  alerts,
  readingsCount,
  onOpenSources,
  onOpenAlerts,
  onSelectSource,
  onSelectAlert,
}) => {
  const metrics = admin
    ? [
        ['Monitoring points', String(sources.length)],
        ['Open alerts', String(alerts.filter(a => (a.state || 'OPEN') === 'OPEN').length)],
        ['Readings loaded', String(readingsCount)],
        ['Data connection', API ? 'Live API' : 'Demo preview'],
      ]
    : [
        ['Monitoring points', String(sources.length)],
        ['Open notices', String(alerts.length)],
        ['Wards covered', '66'],
        ['Data connection', API ? 'Live API' : 'Demo preview'],
      ];

  return (
    <>
      <div className="metric-row">
        {metrics.map(([label, value]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{loading ? '…' : value}</strong>
            <small>
              {label === 'Data connection'
                ? API
                  ? 'Connected to Lambda'
                  : 'Illustrative local dataset'
                : API
                  ? 'From connected API'
                  : 'Gwalior demo dataset'}
            </small>
          </article>
        ))}
      </div>
      <div className="portal-columns">
        <section className="portal-panel">
          <div className="panel-heading">
            <div>
              <div className="panel-eyebrow">{admin ? 'REVIEW WORKSPACE' : 'PUBLIC DIRECTORY'}</div>
              <h2>{admin ? 'Source overview' : 'Gwalior water sources'}</h2>
            </div>
            <button className="text-link" onClick={onOpenSources}>
              View all →
            </button>
          </div>
          <SourceTable sources={sources.slice(0, 5)} admin={admin} onSelect={s => onSelectSource(s.sourceId)} />
        </section>
        <section className="portal-panel">
          <div className="panel-heading">
            <div>
              <div className="panel-eyebrow">{admin ? 'INCIDENT QUEUE' : 'PUBLIC NOTICES'}</div>
              <h2>{admin ? 'Recent alerts' : 'Ward advisories'}</h2>
            </div>
            <button className="text-link" onClick={onOpenAlerts}>
              View all →
            </button>
          </div>
          <AlertList alerts={alerts.slice(0, 4)} sources={sources} onSelect={a => onSelectAlert(a.sourceId)} />
        </section>
      </div>
    </>
  );
};

export default OverviewDashboard;
