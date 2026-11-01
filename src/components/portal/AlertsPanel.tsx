import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { Alert, Source } from '../../types/water';
import AlertList from '../alerts/AlertList';
import { ALERT_SEVERITIES, getAlertSeverity } from '../../config/alertSeverities';
import type { AlertSeverityLevel } from '../../config/alertSeverities';

import AlertDetailDrawer from '../alerts/AlertDetailDrawer';

type AlertsPanelProps = {
  admin: boolean;
  alerts: Alert[];
  sources: Source[];
  busy: boolean;
  onSelect?: (sourceId: string) => void;
  onSelectAlert?: (alert: Alert) => void;
  onSubmitAction?: (event: FormEvent<HTMLFormElement>) => void;
};

const AlertsPanel: FC<AlertsPanelProps> = ({
  admin,
  alerts,
  sources,
  busy,
  onSelect,
  onSelectAlert,
  onSubmitAction,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverityLevel | 'ALL'>('ALL');
  const [internalAlertId, setInternalAlertId] = useState<string | null>(null);

  const filteredAlerts = alerts.filter((a) => {
    if (selectedSeverity === 'ALL') return true;
    const s = getAlertSeverity(a.severity, a.state);
    return s.id === selectedSeverity;
  });

  const hasActionPanel = Boolean(admin && onSubmitAction);

  return (
    <div className="space-y-6 w-full">
      {/* Main Alerts Content & Incident Queue */}
      <div className={hasActionPanel ? 'portal-columns' : 'w-full'}>
        <section className={`portal-panel w-full ${!hasActionPanel ? 'portal-panel-full' : ''}`}>
          <div className="panel-heading flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="panel-eyebrow font-mono text-[10px] tracking-wider text-cyan-400">
                {admin ? 'INCIDENT SURVEILLANCE QUEUE' : 'PUBLISHED WATER ADVISORIES'}
              </div>
              <h2 className="text-xl font-bold text-white">
                {admin ? 'Alert review & incident queue' : 'Active alerts & notices'}
              </h2>
            </div>

            {/* Quick Severity Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedSeverity('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  selectedSeverity === 'ALL'
                    ? 'bg-slate-700 text-white font-bold shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white'
                }`}
                style={{ appearance: 'none', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                All ({alerts.length})
              </button>
              {(Object.keys(ALERT_SEVERITIES) as AlertSeverityLevel[]).map((levelKey) => {
                const conf = ALERT_SEVERITIES[levelKey];
                const count = alerts.filter((a) => getAlertSeverity(a.severity, a.state).id === levelKey).length;
                const isActive = selectedSeverity === levelKey;
                return (
                  <button
                    key={levelKey}
                    type="button"
                    onClick={() => setSelectedSeverity(levelKey)}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                    style={{
                      appearance: 'none',
                      backgroundColor: isActive ? conf.bgHex : 'rgba(15, 23, 42, 0.75)',
                      color: isActive ? '#ffffff' : conf.badgeText,
                      border: `1px solid ${isActive ? conf.hex : 'rgba(255, 255, 255, 0.1)'}`,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: conf.hex }}></span>
                    <span>{conf.badgeLabel}</span>
                    {count > 0 && <span className="text-[10px] opacity-80">({count})</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <AlertList
            alerts={filteredAlerts}
            sources={sources}
            onSelect={(a) => {
              if (onSelectAlert) {
                onSelectAlert(a);
              } else {
                setInternalAlertId(a.alertId);
              }
            }}
          />
        </section>

        {admin && onSubmitAction && (
          <section className="portal-panel">
            <div className="panel-heading">
              <div>
                <div className="panel-eyebrow font-mono text-[10px] tracking-wider text-cyan-400">
                  APPEND-ONLY RESPONSE LOG
                </div>
                <h2 className="text-xl font-bold text-white">Record an action</h2>
              </div>
            </div>
            <form className="portal-form" onSubmit={onSubmitAction}>
              <label>
                Target Alert
                <select name="alertId" required className="bg-slate-900 border border-slate-700 text-white">
                  {alerts.map((a) => (
                    <option key={a.alertId} value={a.alertId}>
                      {a.alertId} &bull; {a.sourceId} &bull; ({a.severity || 'NOTICE'})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Action type
                <select name="actionType" className="bg-slate-900 border border-slate-700 text-white">
                  <option>ACKNOWLEDGEMENT</option>
                  <option>INVESTIGATION</option>
                  <option>VERIFICATION</option>
                  <option>RESOLUTION</option>
                </select>
              </label>
              <label>
                Summary / reason
                <textarea
                  name="summary"
                  required
                  minLength={3}
                  placeholder="Describe the response action and corrective procedure..."
                  className="bg-slate-900 border border-slate-700 text-white"
                />
              </label>
              <button className="primary-button" disabled={busy || !alerts.length}>
                {busy ? 'Saving…' : 'Record response action →'}
              </button>
              <small className="text-xs text-slate-400">
                Actor identity recorded via authenticated audit log. All entries append to immutable ledger.
              </small>
            </form>
          </section>
        )}
      </div>
      {internalAlertId && !onSelectAlert && (
        <AlertDetailDrawer
          alertId={internalAlertId}
          alerts={alerts}
          sources={sources}
          onClose={() => setInternalAlertId(null)}
          onOpenSource={onSelect}
          isStaff={admin}
        />
      )}
    </div>
  );
};

export default AlertsPanel;
