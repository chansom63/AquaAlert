import type { FC } from 'react';
import { AlertTriangle, ArrowRight, ClipboardList, Droplet, FlaskConical } from 'lucide-react';
import type { Alert, Source } from '../../types/water';
import type { ApiRecord } from '../../api/adminRecords';
import { displayDate, humanize, stringValue } from '../../api/adminRecords';
import { MapExplorer } from '../MapExplorer';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface Props {
  sources: Source[];
  alerts: Alert[];
  readings: ApiRecord[];
  actions: ApiRecord[];
  loading: boolean;
  onNavigateTo: (view: string) => void;
  onQuickAction: (action: 'submit-reading' | 'record-action' | 'rules' | 'upload-evidence') => void;
}

export const AdminDashboardView: FC<Props> = ({
  sources,
  alerts,
  readings,
  actions,
  loading,
  onNavigateTo,
  onQuickAction,
}) => {
  if (loading && sources.length === 0 && alerts.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <LoadingSpinner
          label="Connecting to Central Database…"
          sublabel="Loading live Gwalior water surveillance summary"
          fullHeight
        />
      </div>
    );
  }

  const activeAlerts = alerts.filter(alert => /open|active|investigation|monitoring/i.test(alert.state ?? ''));
  const recentReadings = [...readings]
    .sort((a, b) => new Date(String(b.collectedAt ?? '')).getTime() - new Date(String(a.collectedAt ?? '')).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-4 font-sans">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Water Sources', value: sources.length, icon: <Droplet className="w-5 h-5" /> },
          { label: 'Water Readings', value: readings.length, icon: <FlaskConical className="w-5 h-5" /> },
          { label: 'Alerts', value: alerts.length, icon: <AlertTriangle className="w-5 h-5" /> },
          { label: 'Response Actions', value: actions.length, icon: <ClipboardList className="w-5 h-5" /> },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border bg-white p-4">
            <div className="flex items-center gap-3 text-blue-600">
              {card.icon}
              <div className="text-slate-900">
                <div className="text-xs text-slate-500">{card.label}</div>
                <div className="text-2xl font-black">{card.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-x-auto rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-sm font-bold text-slate-900">Active Alerts</h2>
          <button onClick={() => onNavigateTo('Alerts & Incidents')} className="text-xs text-blue-600 hover:underline">
            View all →
          </button>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              {['Alert ID', 'Source', 'Severity', 'State', 'Updated'].map(label => (
                <th key={label} className="p-2">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeAlerts.slice(0, 5).map(alert => (
              <tr key={alert.alertId} className="hover:bg-[#162354] transition">
                <td className="p-2 font-mono font-medium text-blue-600">{alert.alertId}</td>
                <td className="p-2 font-medium text-slate-800">
                  {sources.find(source => source.sourceId === alert.sourceId)?.name ?? alert.sourceId}
                </td>
                <td className="p-2">{humanize(alert.severity)}</td>
                <td className="p-2">{humanize(alert.state)}</td>
                <td className="p-2 text-slate-400">
                  {displayDate(alert.updatedAt ?? alert.issuedAt ?? alert.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && activeAlerts.length === 0 && (
          <p className="pt-3 text-xs text-slate-500">No active alerts returned by the API.</p>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b pb-3">
          <h2 className="text-sm font-bold text-slate-900">Water Sources Map</h2>
          <button onClick={() => onNavigateTo('Water Sources')} className="text-xs text-blue-600 hover:underline">
            View sources →
          </button>
        </div>
        <MapExplorer sources={sources} showStationCard={false} />
      </section>

      <section className="overflow-x-auto rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Recent Readings</h2>
            <span className="text-[11px] text-slate-400 font-mono">
              ({recentReadings.length > 0 ? `Top ${recentReadings.length} Telemetry Records` : 'Top 10 Live Telemetry Samples'})
            </span>
          </div>
          <button onClick={() => onNavigateTo('Readings')} className="text-xs text-blue-600 hover:underline">
            View all readings →
          </button>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              {['Reading ID', 'Source', 'Parameters', 'Verification', 'Collected'].map(label => (
                <th key={label} className="p-2">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recentReadings.map((reading, index) => (
              <tr key={stringValue(reading.readingId, String(index))} className="hover:bg-[#162354] transition">
                <td className="p-2 font-mono font-medium text-slate-900">{stringValue(reading.readingId)}</td>
                <td className="p-2 font-medium text-blue-600">
                  <div>{stringValue(reading.sourceId)}</div>
                  {sources.find(source => source.sourceId === reading.sourceId)?.name && (
                    <div className="text-[10px] text-slate-400 font-normal truncate max-w-[150px]">
                      {sources.find(source => source.sourceId === reading.sourceId)?.name}
                    </div>
                  )}
                </td>
                <td className="p-2 text-slate-700 max-w-md">
                  {reading.parameters && typeof reading.parameters === 'object'
                    ? Object.entries(reading.parameters as Record<string, unknown>).map(([name, raw]) => {
                        const p = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
                        return `${name}: ${stringValue(p.value)} ${stringValue(p.unit, '')}`;
                      }).join(' · ')
                    : stringValue(reading.value)}
                </td>
                <td className="p-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    reading.verificationStatus === 'LAB_VERIFIED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : reading.verificationStatus === 'REJECTED_ANOMALY' || reading.verificationStatus === 'FLAGGED_ANOMALY'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {humanize(reading.verificationStatus)}
                  </span>
                </td>
                <td className="p-2 text-slate-400">{displayDate(reading.collectedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {recentReadings.length === 0 && (
          <p className="pt-3 text-xs text-slate-500">
            {loading ? 'Fetching recent readings from central database…' : 'No telemetry readings currently recorded.'}
          </p>
        )}
      </section>

      {/* ── QUICK ACTIONS (4 THEMED CARDS LIKE LANDING PAGE) ── */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Quick Actions</h2>
            <p className="text-xs text-slate-500 mt-0.5">Rapid operational workflows for water surveillance, response, and compliance</p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold self-start sm:self-auto">
            4 Workflows Available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Submit Reading (Cyan/Sky Telemetry Theme) */}
          <article
            onClick={() => onQuickAction('submit-reading')}
            style={{
              background: 'linear-gradient(150deg, #0c2b4d 0%, #06172e 100%)',
              borderColor: 'rgba(56, 189, 248, 0.35)',
            }}
            className="group relative flex flex-col min-h-[340px] p-5 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:shadow-cyan-950/40 hover:-translate-y-1 cursor-pointer overflow-hidden"
          >
            <div className="mb-2 transition-transform duration-300 group-hover:scale-105">
              <svg className="w-full h-28" viewBox="0 0 280 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="qa-water-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                  <radialGradient id="qa-glow-cyan" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="75" cy="65" r="50" fill="url(#qa-glow-cyan)" />
                <ellipse cx="75" cy="112" rx="38" ry="7" fill="#38bdf8" fillOpacity="0.12" />
                <path d="M64 34 L64 52 L44 96 A 8 8 0 0 0 51 108 L99 108 A 8 8 0 0 0 106 96 L86 52 L86 34 Z" fill="#08223d" stroke="#38bdf8" strokeWidth="2" />
                <path d="M51 104 L99 104 L93 82 Q75 76 57 82 Z" fill="url(#qa-water-grad)" fillOpacity="0.85" />
                <path d="M58 34 Q75 30 92 34" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M75 16 C72 21 69 25 75 30 C81 25 78 21 75 16 Z" fill="#38bdf8" />
                <rect x="130" y="28" width="130" height="74" rx="8" fill="#081d33" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
                <text x="140" y="45" fill="#93c5fd" fontSize="9" fontFamily="monospace" fontWeight="600">pH 7.2</text>
                <rect x="180" y="39" width="70" height="5" rx="2.5" fill="#1e3a5f" />
                <rect x="180" y="39" width="48" height="5" rx="2.5" fill="#38bdf8" />
                <text x="140" y="65" fill="#93c5fd" fontSize="9" fontFamily="monospace" fontWeight="600">TURB 0.4</text>
                <rect x="190" y="59" width="60" height="5" rx="2.5" fill="#1e3a5f" />
                <rect x="190" y="59" width="24" height="5" rx="2.5" fill="#34d399" />
                <text x="140" y="85" fill="#93c5fd" fontSize="9" fontFamily="monospace" fontWeight="600">TDS 240</text>
                <rect x="180" y="79" width="70" height="5" rx="2.5" fill="#1e3a5f" />
                <rect x="180" y="79" width="42" height="5" rx="2.5" fill="#60a5fa" />
              </svg>
            </div>
            <div className="mb-2">
              <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md border bg-sky-500/15 text-sky-300 border-sky-500/30">
                FIELD TELEMETRY
              </span>
            </div>
            <h3 className="text-base font-bold text-white mb-2 leading-tight">
              Submit Reading
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Ingest water screening measurements, sensor telemetry, and physical testing values across municipal sampling points.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction('submit-reading');
              }}
              className="mt-auto w-full py-2.5 px-3.5 rounded-lg border font-bold text-xs flex items-center justify-between transition-all duration-200 cursor-pointer bg-[#093154] hover:bg-[#0d4373] text-sky-300 border-sky-400/40 group-hover:border-sky-400"
            >
              <span>Submit Reading</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </article>

          {/* Card 2: Record Response Action (Emerald/Mint Response Theme) */}
          <article
            onClick={() => onQuickAction('record-action')}
            style={{
              background: 'linear-gradient(150deg, #09332c 0%, #051c19 100%)',
              borderColor: 'rgba(52, 211, 153, 0.35)',
            }}
            className="group relative flex flex-col min-h-[340px] p-5 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:shadow-emerald-950/40 hover:-translate-y-1 cursor-pointer overflow-hidden"
          >
            <div className="mb-2 transition-transform duration-300 group-hover:scale-105">
              <svg className="w-full h-28" viewBox="0 0 280 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="qa-glow-mint" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="140" cy="65" r="50" fill="url(#qa-glow-mint)" />
                <path d="M20 90 Q65 55 110 80 T200 60 T260 75" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
                <path d="M20 90 Q65 55 110 80 T150 65" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="65" cy="69" r="6" fill="#042f26" stroke="#34d399" strokeWidth="2" />
                <circle cx="65" cy="69" r="2.5" fill="#6ee7b7" />
                <rect x="120" y="28" width="48" height="48" rx="8" fill="#063229" stroke="#34d399" strokeWidth="2" />
                <path d="M133 52 L141 60 L155 44" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="144" cy="52" r="20" stroke="#34d399" strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
                <circle cx="215" cy="66" r="6" fill="#042f26" stroke="#34d399" strokeWidth="2" />
                <circle cx="215" cy="66" r="2.5" fill="#6ee7b7" />
                <rect x="105" y="88" width="78" height="18" rx="9" fill="#064e3b" stroke="#059669" strokeWidth="1" />
                <text x="144" y="100" fill="#a7f3d0" fontSize="8.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">RESOLVED</text>
              </svg>
            </div>
            <div className="mb-2">
              <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                OPERATOR DISPATCH
              </span>
            </div>
            <h3 className="text-base font-bold text-white mb-2 leading-tight">
              Record Response Action
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Document pipe flushes, field inspections, chemical neutralizing, and sanitarian crew dispatches for active incidents.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction('record-action');
              }}
              className="mt-auto w-full py-2.5 px-3.5 rounded-lg border font-bold text-xs flex items-center justify-between transition-all duration-200 cursor-pointer bg-[#083830] hover:bg-[#0e4a40] text-emerald-300 border-emerald-400/40 group-hover:border-emerald-400"
            >
              <span>Record Action</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </article>

          {/* Card 3: Rules & Thresholds (Amber/Gold Regulatory Theme) */}
          <article
            onClick={() => onQuickAction('rules')}
            style={{
              background: 'linear-gradient(150deg, #38240a 0%, #1c1204 100%)',
              borderColor: 'rgba(251, 191, 36, 0.35)',
            }}
            className="group relative flex flex-col min-h-[340px] p-5 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:shadow-amber-950/40 hover:-translate-y-1 cursor-pointer overflow-hidden"
          >
            <div className="mb-2 transition-transform duration-300 group-hover:scale-105">
              <svg className="w-full h-28" viewBox="0 0 280 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="qa-glow-amber" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="140" cy="65" r="50" fill="url(#qa-glow-amber)" />
                <rect x="25" y="20" width="230" height="88" rx="10" fill="#1f1406" stroke="rgba(251,191,36,0.3)" strokeWidth="1.5" />
                <text x="38" y="37" fill="#fde68a" fontSize="8.5" fontFamily="monospace" fontWeight="bold">BIS IS 10500 SPECIFICATION</text>
                <circle cx="242" cy="34" r="3" fill="#fbbf24" />
                <text x="38" y="55" fill="#cbd5e1" fontSize="8" fontFamily="monospace">pH Tolerance [6.5 - 8.5]</text>
                <rect x="38" y="61" width="204" height="6" rx="3" fill="#3a250a" />
                <rect x="80" y="61" width="105" height="6" rx="3" fill="#fbbf24" fillOpacity="0.8" />
                <circle cx="80" cy="64" r="5.5" fill="#fde68a" stroke="#d97706" strokeWidth="2" />
                <circle cx="185" cy="64" r="5.5" fill="#fde68a" stroke="#d97706" strokeWidth="2" />
                <text x="38" y="84" fill="#cbd5e1" fontSize="8" fontFamily="monospace">Turbidity Limit [&le; 1 NTU]</text>
                <rect x="38" y="90" width="204" height="6" rx="3" fill="#3a250a" />
                <rect x="38" y="90" width="125" height="6" rx="3" fill="#34d399" fillOpacity="0.8" />
                <rect x="163" y="90" width="79" height="6" rx="3" fill="#f87171" fillOpacity="0.8" />
                <circle cx="163" cy="93" r="5.5" fill="#fca5a5" stroke="#ef4444" strokeWidth="2" />
              </svg>
            </div>
            <div className="mb-2">
              <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md border bg-amber-500/15 text-amber-300 border-amber-500/30">
                SAFETY STANDARDS
              </span>
            </div>
            <h3 className="text-base font-bold text-white mb-2 leading-tight">
              Rules &amp; Thresholds
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Configure statutory BIS IS 10500 drinking water parameters, tolerance boundaries, and automatic alert escalation rules.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction('rules');
              }}
              className="mt-auto w-full py-2.5 px-3.5 rounded-lg border font-bold text-xs flex items-center justify-between transition-all duration-200 cursor-pointer bg-[#422a0a] hover:bg-[#59380d] text-amber-300 border-amber-400/40 group-hover:border-amber-400"
            >
              <span>Configure Rules</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </article>

          {/* Card 4: Upload Evidence (Purple/Indigo Document Vault Theme) */}
          <article
            onClick={() => onQuickAction('upload-evidence')}
            style={{
              background: 'linear-gradient(150deg, #2b1348 0%, #160a26 100%)',
              borderColor: 'rgba(192, 132, 252, 0.35)',
            }}
            className="group relative flex flex-col min-h-[340px] p-5 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:shadow-purple-950/40 hover:-translate-y-1 cursor-pointer overflow-hidden"
          >
            <div className="mb-2 transition-transform duration-300 group-hover:scale-105">
              <svg className="w-full h-28" viewBox="0 0 280 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="qa-glow-purple" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="140" cy="65" r="50" fill="url(#qa-glow-purple)" />
                <rect x="80" y="20" width="120" height="90" rx="8" fill="#180e2b" stroke="#a855f7" strokeWidth="1.5" />
                <rect x="94" y="32" width="60" height="5" rx="2.5" fill="#c084fc" />
                <rect x="94" y="44" width="92" height="3" rx="1.5" fill="#6b21a8" />
                <rect x="94" y="52" width="80" height="3" rx="1.5" fill="#6b21a8" />
                <rect x="94" y="60" width="88" height="3" rx="1.5" fill="#6b21a8" />
                <circle cx="165" cy="84" r="14" fill="#78350f" stroke="#fbbf24" strokeWidth="2" />
                <path d="M159 84 L163 88 L171 80" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="94" y="74" width="50" height="20" rx="4" fill="#3b0764" stroke="#a855f7" strokeWidth="1" />
                <text x="119" y="87" fill="#e9d5ff" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">AES-256</text>
              </svg>
            </div>
            <div className="mb-2">
              <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md border bg-purple-500/15 text-purple-300 border-purple-500/30">
                EVIDENCE ARCHIVE
              </span>
            </div>
            <h3 className="text-base font-bold text-white mb-2 leading-tight">
              Upload Evidence
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Upload accredited NABL laboratory analysis certificates, chain-of-custody PDFs, and regulatory compliance evidence documents.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction('upload-evidence');
              }}
              className="mt-auto w-full py-2.5 px-3.5 rounded-lg border font-bold text-xs flex items-center justify-between transition-all duration-200 cursor-pointer bg-[#391861] hover:bg-[#4c2082] text-purple-300 border-purple-400/40 group-hover:border-purple-400"
            >
              <span>Upload Document</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </article>
        </div>
      </section>
    </div>
  );
};
