import type { FC } from 'react';
import { date } from '../../api/client';
import type { Alert, Source } from '../../types/water';
import { getAlertSeverity } from '../../config/alertSeverities';
import { ChevronRight } from 'lucide-react';

const AlertList: FC<{ alerts: Alert[]; sources: Source[]; onSelect: (a: Alert) => void }> = ({
  alerts,
  sources,
  onSelect,
}) => {
  if (!alerts.length) {
    return <p className="empty-state">No alerts returned.</p>;
  }

  return (
    <div className="space-y-3.5 w-full">
      {alerts.map((a) => {
        const severity = getAlertSeverity(a.severity, a.state);
        const Icon = severity.icon;
        const sourceName = sources.find((s) => s.sourceId === a.sourceId)?.name || a.sourceId;

        return (
          <article
            key={a.alertId}
            onClick={() => onSelect(a)}
            className="alert-card-item group w-full"
            style={{
              borderLeft: `4px solid ${severity.hex}`,
            }}
          >
            <div className="flex items-start gap-4 min-w-0 flex-1">
              {/* Severity Icon Square matching specification */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md transition-transform group-hover:scale-105"
                style={{ backgroundColor: severity.bgHex }}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>

              {/* Alert Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap mb-1">
                  <h4 className="font-bold text-sm sm:text-base text-white group-hover:text-cyan-300 transition-colors">
                    {a.publicMessage || a.reason || 'Water Quality Screening Alert'}
                  </h4>
                </div>

                <p className="text-xs text-slate-300 mb-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-200">{sourceName}</span>
                  <span className="text-slate-500">&bull;</span>
                  <span className="text-slate-400 font-mono text-[11px]">{date(a.issuedAt)}</span>
                </p>

                {a.reason && a.publicMessage && a.reason !== a.publicMessage && (
                  <p className="text-xs text-slate-400 line-clamp-2 mb-1.5">{a.reason}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-slate-400">
                  <span className="px-2 py-0.5 rounded-md bg-slate-950/70 border border-slate-700/60 text-slate-300">
                    ID: {a.alertId}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-950/70 border border-slate-700/60 text-slate-300">
                    State: {a.state || 'OPEN'}
                  </span>
                </div>
              </div>
            </div>

            {/* Severity Status Badge and Action Button */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider font-mono shadow-sm"
                style={{
                  backgroundColor: severity.badgeBg,
                  color: severity.badgeText,
                  border: `1px solid ${severity.badgeBorder}`,
                }}
              >
                {severity.badgeLabel}
              </span>

              <button
                type="button"
                className="alert-card-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(a);
                }}
              >
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default AlertList;
