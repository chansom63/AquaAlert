import type { FC, FormEvent } from 'react';
import type { Alert, Source } from '../../types/water';
import AlertList from '../alerts/AlertList';

type AlertsPanelProps = {
  admin: boolean;
  alerts: Alert[];
  sources: Source[];
  busy: boolean;
  onSelect: (sourceId: string) => void;
  onSubmitAction?: (event: FormEvent<HTMLFormElement>) => void;
};

const AlertsPanel: FC<AlertsPanelProps> = ({ admin, alerts, sources, busy, onSelect, onSubmitAction }) => (
  <div className="portal-columns">
    <section className="portal-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-eyebrow">{admin ? 'INCIDENT QUEUE' : 'PUBLISHED ALERTS'}</div>
          <h2>{admin ? 'Alert review' : 'Alerts and notices'}</h2>
        </div>
      </div>
      <AlertList alerts={alerts} sources={sources} onSelect={a => onSelect(a.sourceId)} />
    </section>
    {admin && onSubmitAction && (
      <section className="portal-panel">
        <div className="panel-heading">
          <div>
            <div className="panel-eyebrow">APPEND-ONLY RESPONSE LOG</div>
            <h2>Record an action</h2>
          </div>
        </div>
        <form className="portal-form" onSubmit={onSubmitAction}>
          <label>
            Alert
            <select name="alertId" required>
              {alerts.map(a => (
                <option key={a.alertId} value={a.alertId}>
                  {a.alertId} · {a.sourceId}
                </option>
              ))}
            </select>
          </label>
          <label>
            Action type
            <select name="actionType">
              <option>ACKNOWLEDGEMENT</option>
              <option>INVESTIGATION</option>
              <option>VERIFICATION</option>
              <option>RESOLUTION</option>
            </select>
          </label>
          <label>
            Summary / reason
            <textarea name="summary" required minLength={3} placeholder="Describe the response and reason" />
          </label>
          <button className="primary-button" disabled={busy || !alerts.length}>
            {busy ? 'Saving…' : 'Record response action →'}
          </button>
          <small>Actor identity is not captured by the provided Lambda route. Use authenticated API authorization before production.</small>
        </form>
      </section>
    )}
  </div>
);

export default AlertsPanel;
