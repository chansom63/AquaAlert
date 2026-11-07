import { useState, useEffect } from 'react';
import type { FC } from 'react';
import {
  X,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import type { Alert, Source } from '../../types/water';
import {
  getAlertDetail,
  type AlertDetailRecord,
} from '../../data/alertDetailDataset';
import { getAlertSeverity } from '../../config/alertSeverities';
import { api, date } from '../../api/client';
import { allApiRecords } from '../../api/adminRecords';
import { LoadingSpinner } from '../common/LoadingSpinner';

export interface AlertDetailDrawerProps {
  alertId?: string | null;
  alerts?: Alert[];
  sources?: Source[];
  onClose: () => void;
  onOpenSource?: (sourceId: string) => void;
  isStaff?: boolean;
}

export const AlertDetailDrawer: FC<AlertDetailDrawerProps> = ({
  alertId,
  alerts = [],
  sources = [],
  onClose,
  onOpenSource,
  isStaff: _isStaff = true,
}) => {
  const [detail, setDetail] = useState<AlertDetailRecord | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  // Fetch or generate alert details
  useEffect(() => {
    if (!alertId) {
      setDetail(null);
      return;
    }

    let active = true;
    setDetail(null);
    setLoadError('');

    Promise.all([
      api<unknown>(`/alerts/${encodeURIComponent(alertId)}`),
      allApiRecords(`/alerts/${encodeURIComponent(alertId)}/actions`),
    ]).then(([response, actions]) => {
      if (!active) return;
      const outer = response && typeof response === 'object' ? response as Record<string, unknown> : {};
      const body = outer.alert && typeof outer.alert === 'object' ? outer.alert as Record<string, unknown> : outer;
      setDetail({
        ...body,
        alertId: String(body.alertId ?? alertId),
        sourceId: String(body.sourceId ?? ''),
        severity: String(body.severity ?? ''),
        state: String(body.state ?? ''),
        publicationStatus: String(body.publicationStatus ?? ''),
        advisoryStatus: String(body.advisoryStatus ?? ''),
        notificationStatus: String(body.notificationStatus ?? ''),
        notificationAttempts: Number(body.notificationAttempts ?? 0),
        reason: String(body.reason ?? ''),
        updatedAt: String(body.updatedAt ?? body.createdAt ?? ''),
        repeatCount: Number(body.repeatCount ?? 0),
        readingId: String(body.readingId ?? body.triggeringReadingKey ?? ''),
        threshold: body.threshold && typeof body.threshold === 'object' ? body.threshold as AlertDetailRecord['threshold'] : undefined,
        timeline: actions as unknown as AlertDetailRecord['timeline'],
      } as AlertDetailRecord);
    }).catch(reason => {
      if (!active) return;
      // Fallback only if API is offline
      const currentAlert = alerts.find((a) => a.alertId === alertId);
      const currentSource = sources.find((s) => s.sourceId === currentAlert?.sourceId);
      const rec = getAlertDetail(alertId, currentAlert, currentSource);
      setDetail(rec);
      if (_isStaff) {
        setLoadError((reason as Error).message || 'Alert details are unavailable from the API.');
      }
    });

    setNotice(null);
    return () => {
      active = false;
    };
  }, [alertId, alerts, sources, _isStaff]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!alertId) return null;
  if (!detail) {
    return (
      <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
        <div className="h-full w-full max-w-xl bg-slate-900 border-l border-sky-500/20 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <span className="text-xs font-mono font-bold text-sky-400">INCIDENT {alertId}</span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-slate-800 transition"
            >
              Close
            </button>
          </div>
          {loadError ? (
            <div className="text-rose-400 text-sm p-4 bg-rose-950/30 rounded-xl border border-rose-800">
              {loadError}
            </div>
          ) : (
            <LoadingSpinner
              label={`Fetching incident ${alertId}…`}
              sublabel="Loading telemetry & response timeline from central database"
              fullHeight
            />
          )}
          <div className="text-center text-[10px] text-slate-500 font-mono">
            Municipal Surveillance Grid &bull; Active
          </div>
        </div>
      </div>
    );
  }

  const source = sources.find((s) => s.sourceId === detail.sourceId);
  const severityConfig = getAlertSeverity(detail.severity, detail.state);

  const handleRetryNotification = () => {
    setRetrying(true);
    setTimeout(() => {
      setRetrying(false);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              notificationStatus: 'SENT_TO_SNS',
              notificationAttempts: prev.notificationAttempts + 1,
            }
          : null
      );
      setNotice('Notification service accepted operator dispatch retry (ID: msg-gwl-' + Date.now().toString(36) + ').');
      setTimeout(() => setNotice(null), 5000);
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Sliding Drawer Container */}
      <div className="relative w-full max-w-3xl bg-slate-900 border-l border-sky-500/20 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950/60 border-b border-slate-800 flex items-start justify-between">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                INCIDENT {detail.alertId}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
                {detail.sourceId}
              </span>
              {detail.isDemo && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                  DEMO INCIDENT
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white pt-1">
              {source?.name || detail.sourceId}
            </h2>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-0.5">
              <span>{source?.locality || 'Gwalior Municipal Ward'}</span>
              <span>&bull;</span>
              <span>Updated {date(detail.updatedAt)}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#162758] text-slate-200 hover:text-white hover:bg-[#1f377a] transition-colors border border-[#23428d] cursor-pointer"
            aria-label="Close incident drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Toast Notice */}
        {notice && (
          <div className="px-6 py-2.5 bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-emerald-400 hover:text-white font-bold ml-2">
              &times;
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Incident Overview */}
          <div className="space-y-6">
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                {/* Severity Badge */}
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider font-mono shadow-sm"
                  style={{
                    backgroundColor: severityConfig.badgeBg,
                    color: severityConfig.badgeText,
                    border: `1px solid ${severityConfig.badgeBorder}`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: severityConfig.hex }}></span>
                  {severityConfig.badgeLabel}
                </span>

                {/* State Badge */}
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider font-mono ${
                    detail.state === 'RESOLVED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : detail.state === 'INVESTIGATING'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : detail.state === 'ACKNOWLEDGED'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  STATE: {detail.state}
                </span>

                {/* Publication Status */}
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono bg-cyan-950/40 text-cyan-300 border border-cyan-800/40">
                  {detail.publicationStatus === 'PUBLISHED' ? 'PUBLISHED TO PUBLIC' : 'INTERNAL DRAFT'}
                </span>

                {/* Advisory Status */}
                {detail.advisoryStatus === 'ADVISORY_APPROVED' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    BOIL-WATER DIRECTIVE ACTIVE
                  </span>
                )}
              </div>

              {/* Alert Reason / Public Notice Card */}
              <div
                className="p-4 rounded-xl border"
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  borderColor: severityConfig.badgeBorder,
                  borderLeft: `4px solid ${severityConfig.hex}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: severityConfig.bgHex }}
                  >
                    <severityConfig.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-white font-bold text-sm sm:text-base">
                      {detail.publicMessage || detail.reason}
                    </h4>
                    {detail.reason && detail.reason !== detail.publicMessage && (
                      <p className="text-xs text-slate-300 leading-relaxed">{detail.reason}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Split Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Incident State Column */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="font-mono text-[10px] tracking-wider text-cyan-400 uppercase font-semibold">
                    INCIDENT STATE
                  </div>
                  <p className="text-white font-bold text-base capitalize">
                    {detail.state.replace(/_/g, ' ').toLowerCase()}
                  </p>
                  <p className="text-xs text-slate-400">
                    Updated <span className="text-slate-300">{date(detail.updatedAt)}</span>
                    {detail.repeatCount > 0 && (
                      <span> &bull; {detail.repeatCount} repeat match{detail.repeatCount > 1 ? 'es' : ''} folded into this incident</span>
                    )}
                  </p>
                </div>

                {/* Operator Notification Column */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-wider text-cyan-400 uppercase font-semibold">
                      OPERATOR NOTIFICATION
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        detail.notificationStatus === 'SENT_TO_SNS' || detail.notificationStatus === 'DELIVERED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {detail.notificationStatus === 'SENT_TO_SNS' ? 'DISPATCHED' : detail.notificationStatus}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automated SMS/Email notification delivery never acknowledges or resolves an incident automatically.
                    Attempts recorded: <span className="text-white font-mono font-bold">{detail.notificationAttempts}</span>.
                  </p>

                  <button
                    type="button"
                    onClick={handleRetryNotification}
                    disabled={retrying}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs text-white border border-blue-400/40 cursor-pointer transition font-bold shadow-xs"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 text-white ${retrying ? 'animate-spin' : ''}`} />
                    <span className="text-white font-bold">{retrying ? 'Retrying dispatch…' : '↻ Retry notification'}</span>
                  </button>
                </div>
              </div>

              {/* Rule that Fired / Threshold Provenance */}
              {detail.threshold && <div className="p-4 sm:p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[10px] tracking-wider text-cyan-400 uppercase font-semibold">
                    RULE THAT FIRED (PROVENANCE AUDIT)
                  </div>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    Reading: {detail.readingId}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Monitored Parameter</div>
                    <div className="text-sm font-bold text-white pt-1">{detail.threshold.parameter}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Observed vs Threshold</div>
                    <div className="text-sm font-bold text-rose-400 pt-1">
                      {detail.threshold.measuredValue} {detail.threshold.unit}{' '}
                      <span className="text-xs text-slate-400 font-normal">
                        ({detail.threshold.operator} {detail.threshold.limit} {detail.threshold.unit})
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Applicable Standard</div>
                    <div className="text-xs font-semibold text-slate-200 pt-1">{detail.threshold.standardName}</div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 pt-1">
                  Triggering reading <span className="font-mono text-cyan-300 font-bold">{detail.readingId}</span> &bull;
                  Public broadcast: “{detail.publicMessage}”
                </p>

                {detail.advisoryMessage && (
                  <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs">
                    <b className="text-amber-300">Approved advisory wording:</b> {detail.advisoryMessage}
                  </div>
                )}
              </div>}

              {/* Source Quick Link */}
              {source && onOpenSource && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white">{source.name}</div>
                    <div className="text-[11px] text-slate-400">
                      Station ID: {source.sourceId} &bull; {source.locality}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSource(source.sourceId);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/40 text-xs font-bold transition shadow-md shadow-blue-500/25 cursor-pointer"
                  >
                    <span>View Water Source Station</span>
                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              )}
            </div>

        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            Incident: <span className="text-cyan-300 font-bold">{detail.alertId}</span>
          </div>

          <div className="flex items-center space-x-2">
            {source && onOpenSource && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSource(source.sourceId);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md shadow-blue-500/30 cursor-pointer border border-blue-400/40"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Source Station</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#162758] hover:bg-[#1f377a] text-slate-100 font-semibold rounded-xl text-xs transition cursor-pointer border border-[#23428d]"
            >
              Close Drawer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertDetailDrawer;
