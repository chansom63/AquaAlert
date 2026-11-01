import type { FC } from 'react';
import { ALERT_SEVERITIES } from '../../config/alertSeverities';

export const AlertSeverityLegend: FC<{ className?: string }> = ({ className = '' }) => {
  const levels = Object.values(ALERT_SEVERITIES);

  return (
    <div className={`rounded-2xl border border-slate-800/80 bg-black/90 p-5 md:p-6 text-white font-sans ${className}`}>
      <div className="mb-5">
        <h3 className="text-lg md:text-xl font-bold tracking-tight text-white mb-1.5">
          Alert severity colors
        </h3>
        <p className="text-xs md:text-sm text-slate-400">
          Use these colors consistently across alert cards, status badges, icons, and notification indicators.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800/80 divide-y divide-slate-800/70 overflow-hidden bg-slate-950/40">
        {levels.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 gap-4 transition hover:bg-slate-900/40"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Colored Icon Square matching screenshot */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                  style={{ backgroundColor: item.bgHex }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Title & Description */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm md:text-base text-white">
                      {item.label}
                    </span>
                    <span className="text-slate-500">—</span>
                    <code className="text-[11px] md:text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">
                      {item.hex}
                    </code>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Status Badge on the right matching screenshot */}
              <div className="flex-shrink-0">
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: item.badgeBg,
                    color: item.badgeText,
                    border: `1px solid ${item.badgeBorder}`,
                  }}
                >
                  {item.badgeLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertSeverityLegend;
