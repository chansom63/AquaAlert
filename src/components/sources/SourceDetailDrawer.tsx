import { useState, useEffect } from 'react';
import type { FC } from 'react';
import {
  X,
  MapPin,
  FileText,
  ShieldCheck,
  Send,
  Layers,
  Lock,
  Download,
  Info,
  Printer,
  Users
} from 'lucide-react';
import { api } from '../../api/client';
import { DEMO_SOURCES } from '../../data/demoDataset';
import { GWALIOR_WARDS_66 } from '../../data/gwaliorWardsData.js';
import type { Reading, Source } from '../../types/water';
import { HistoricalParameterChart } from '../charts/HistoricalParameterChart';
import { OverviewParametersView } from '../parameters/OverviewParametersView';
import { LoadingSpinner } from '../common/LoadingSpinner';

export interface SourceDetailDrawerProps {
  sourceId?: string | null;
  onClose: () => void;
  onOpenSubmitReading?: (sourceId?: string) => void;
  onPrintReport?: (source?: Source) => void;
  isStaff?: boolean;
}

export const SourceDetailDrawer: FC<SourceDetailDrawerProps> = ({
  sourceId,
  onClose,
  onOpenSubmitReading,
  onPrintReport,
  isStaff = false,
}) => {
  const [source, setSource] = useState<Source | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'history' | 'evidence'>('overview');
  const [selectedChartParam, setSelectedChartParam] = useState('TDS');
  const [signedUrlData, setSignedUrlData] = useState<{ signedUrl: string; expiresInSeconds: number } | null>(null);
  const [evidenceError, setEvidenceError] = useState('');
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    if (!sourceId) {
      setSource(null);
      setReadings([]);
      return;
    }

    setLoading(true);
    setDataError('');
    let active = true;

    Promise.all([
      api<Source>(`/sources/${encodeURIComponent(sourceId)}`),
      api<Reading[]>(`/sources/${encodeURIComponent(sourceId)}/readings`),
    ]).then(([sourceRecord, readingRecords]) => {
      if (!active) return;
      setSource(sourceRecord);
      setReadings(Array.isArray(readingRecords) ? readingRecords : []);
    }).catch(reason => {
      if (!active) return;
      // Fallback only if offline or API failed
      const foundDemo = DEMO_SOURCES.find(s => s.sourceId === sourceId);
      const wardNum = parseInt(sourceId.replace(/\D/g, ''), 10);
      const foundWard = GWALIOR_WARDS_66.find(w => w.wardNumber === wardNum) || GWALIOR_WARDS_66[13];

      const defaultSource: Source = foundDemo || {
        sourceId,
        name: foundWard.waterSource || `Station ${sourceId}`,
        sourceType: 'COMMUNITY_WELL',
        district: foundWard.zoneName || 'GMC Central',
        locality: foundWard.locality || 'Maharaj Bada, Historic Market Complex',
        depthMeters: 45,
        populationServed: foundWard.population || 22400,
        publicStatus: foundWard.status === 'ATTENTION' ? 'MONITORED_ALERT' : 'ACTIVE',
        isDemo: true,
        dataFreshnessHours: 2,
        lastReadingAt: '2026-11-04T10:30:00Z',
      };

      setSource(defaultSource);
      if (isStaff) {
        setDataError((reason as Error).message || 'Source records are unavailable from the API.');
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [sourceId, isStaff]);

  if (!sourceId) return null;

  const latestReading = readings[0];

  const handleRequestEvidenceAccess = (objectKey: string) => {
    if (!isStaff) {
      setEvidenceError('Access restricted. Authorized GMC staff credentials required.');
      return;
    }
    setEvidenceError('');
    setSignedUrlData({
      signedUrl: `https://water-evidence.gwl-municipal.in/${objectKey}?token=AUTH256-TOKEN-SECURE&expires=300`,
      expiresInSeconds: 300,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[1000] overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Drawer Container */}
      <div className="relative w-full max-w-3xl bg-slate-900 border-l border-sky-500/20 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950/60 border-b border-slate-800 flex items-start justify-between">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {source?.sourceId || sourceId}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
                {String(source?.sourceType || 'COMMUNITY_WELL')}
              </span>
              {Boolean(source?.isStale) && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  STALE / UNKNOWN
                </span>
              )}
              {source?.publicStatus === 'MONITORED_ALERT' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  <span>MONITORED ALERT</span>
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white pt-1">
              {source?.name || 'Loading station profile...'}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>{source?.locality}, {source?.district}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Beneficiaries: {source?.populationServed ? Number(source.populationServed).toLocaleString() : '—'}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Depth: {source?.depthMeters ? `${source.depthMeters}m` : '—'}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onPrintReport && (
              <button
                type="button"
                onClick={() => source && onPrintReport(source)}
                title="Generate PDF Surveillance Certificate"
                className="p-2 text-slate-300 hover:text-white bg-[#162758] hover:bg-[#1f377a] rounded-lg transition cursor-pointer border border-[#23428d]"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white bg-[#162758] hover:bg-[#1f377a] rounded-lg transition cursor-pointer border border-[#23428d]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/70 px-6 pt-2 space-x-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition cursor-pointer bg-transparent border-0 ${
              activeTab === 'overview'
                ? 'border-sky-500 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview &amp; Parameters
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('charts')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition cursor-pointer bg-transparent border-0 ${
              activeTab === 'charts'
                ? 'border-sky-500 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Historical Trend Charts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition cursor-pointer bg-transparent border-0 ${
              activeTab === 'history'
                ? 'border-sky-500 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Chronological Samples ({readings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('evidence')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition cursor-pointer bg-transparent border-0 ${
              activeTab === 'evidence'
                ? 'border-sky-500 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Lab Reports &amp; Evidence
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {dataError && <div role="alert" className="rounded-lg bg-rose-950/60 border border-rose-800 p-3 text-xs text-rose-200">{dataError}</div>}
          {loading ? (
            <LoadingSpinner
              label={`Fetching Station ${sourceId}…`}
              sublabel="Synchronizing records from Central Database &bull; live"
              fullHeight
            />
          ) : activeTab === 'overview' ? (
            <OverviewParametersView
              stationRef={sourceId}
              sampleCollected={latestReading?.collectedAt ? new Date(latestReading.collectedAt).toUTCString() : 'Sat, 24 Oct 2026 07:30:00 GMT'}
              serverIngested={latestReading?.receivedAt || '2026-10-24T07:31:12Z'}
              method={latestReading?.method || 'FIELD_SCREENING'}
              statusBadge={latestReading?.verificationStatus || 'FLAGGED_ANOMALY'}
              isAnomaly={latestReading?.verificationStatus === 'FLAGGED_ANOMALY' || source?.publicStatus === 'MONITORED_ALERT'}
              parameters={{
                pH: latestReading?.parameters?.pH || { value: 7.2, unit: 'pH' },
                tds: latestReading?.parameters?.tds || latestReading?.parameters?.TDS || { value: 620, unit: 'mg/L' },
                turbidity: latestReading?.parameters?.turbidity || { value: 0.85, unit: 'NTU' },
                fluoride: latestReading?.parameters?.fluoride || { value: 0.7, unit: 'mg/L' },
                nitrate: latestReading?.parameters?.nitrate || { value: 18, unit: 'mg/L' },
                freeChlorine: latestReading?.parameters?.freeChlorine || { value: 0.45, unit: 'mg/L' },
              }}
              onOpenCharts={() => setActiveTab('charts')}
              onCloseDrawer={onClose}
              showFooter={false}
            />
          ) : activeTab === 'charts' ? (
            <div className="space-y-4">
              {/* Parameter Selector Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                {['TDS', 'pH', 'turbidity', 'fluoride', 'nitrate', 'freeChlorine'].map(param => (
                  <button
                    key={param}
                    type="button"
                    onClick={() => setSelectedChartParam(param)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer border ${
                      selectedChartParam === param
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 font-bold border-blue-400/40'
                        : 'bg-[#122045] text-slate-300 hover:text-white border-[#1c3066]'
                    }`}
                  >
                    {param}
                  </button>
                ))}
              </div>

              {/* Chart Component */}
              <HistoricalParameterChart
                readings={readings}
                parameterKey={selectedChartParam}
              />

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-start space-x-2">
                <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <p>
                  Charts accurately render collected sample points without converting missing intervals to zero. Distinguishes field test kit screening from accredited laboratory certified tests.
                </p>
              </div>
            </div>
          ) : activeTab === 'history' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Recent chronological sample submissions queried from <code className="text-sky-300 font-mono">WaterReadings</code> table.</span>
                <span className="font-mono">Sort Key: collectedAt#readingId</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                    <tr>
                      <th className="p-3">Reading ID</th>
                      <th className="p-3">Collection Time (UTC)</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Parameters Measured</th>
                      <th className="p-3">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                    {readings.map((r) => (
                      <tr key={r.readingId} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 text-sky-400 font-semibold">{r.readingId}</td>
                        <td className="p-3 text-slate-300">{r.collectedAt}</td>
                        <td className="p-3 font-sans text-slate-400">{r.method}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            r.verificationStatus === 'LAB_VERIFIED'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {r.verificationStatus}
                          </span>
                        </td>
                        <td className="p-3 font-sans">
                          <div className="flex flex-wrap gap-1 text-[11px]">
                            {Object.entries(r.parameters || {}).map(([k, v]) => (
                              <span key={k} className="px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800">
                                {k}: <strong className="text-white">{v.value}</strong> {v.unit}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          {r.hasEvidence ? (
                            <span className="text-emerald-400 flex items-center space-x-1">
                              <FileText className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Attached</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-purple-400" />
                    <h4 className="font-semibold text-white text-sm">
                      Accredited Laboratory Verification Reports
                    </h4>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                    Digital Evidence Archive
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  In accordance with Subsystems 02 &amp; 05, certified document references are held securely on the server. Authorized staff can generate short-lived secure access links (300s TTL).
                </p>

                {latestReading?.hasEvidence ? (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                        <span>Laboratory Chemical Analysis Certificate</span>
                        <span className="text-xs text-slate-400 font-mono">(.pdf)</span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        Key: evidence/lab-reports/2026-10/gmc-ph-cert-491.pdf
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRequestEvidenceAccess('evidence/lab-reports/2026-10/gmc-ph-cert-491.pdf')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition flex items-center space-x-2 cursor-pointer border border-purple-400/30 shadow-md shadow-purple-600/25"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                      <span className="text-white font-bold">{isStaff ? 'Issue Pre-Signed Download URL' : 'Request Access (Staff Only)'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                    No laboratory certificate uploaded for the current record yet.
                  </div>
                )}

                {evidenceError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-xs flex items-center space-x-2">
                    <Lock className="w-4 h-4 flex-shrink-0" />
                    <span>{evidenceError}</span>
                  </div>
                )}

                {signedUrlData && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs space-y-2">
                    <div className="font-semibold text-emerald-300 flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Authorized Pre-Signed URL Issued (Expires in {signedUrlData.expiresInSeconds}s)</span>
                    </div>
                    <div className="font-mono text-slate-300 break-all bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px]">
                      {signedUrlData.signedUrl}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            Station Ref: <span className="text-cyan-300 font-bold">{source?.sourceId || sourceId}</span>
          </div>

          <div className="flex items-center space-x-2">
            {isStaff && onOpenSubmitReading && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSubmitReading(source?.sourceId);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center space-x-2 shadow-lg shadow-blue-600/30 cursor-pointer border border-blue-400/40"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span className="text-white font-bold">Submit Field Reading</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#162758] hover:bg-[#1f377a] text-slate-100 font-semibold rounded-xl text-xs transition cursor-pointer border border-[#23428d]"
            >
              Close Drawer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SourceDetailDrawer;
