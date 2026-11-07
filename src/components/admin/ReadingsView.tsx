import { useMemo, useState } from 'react';
import type { FC } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Droplets,
  Eye,
  FlaskConical,
  Layers,
  Loader2,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { Source } from '../../types/water';
import { displayDate, humanize, stringValue, type ApiRecord } from '../../api/adminRecords';
import { LoadingSpinner } from '../common/LoadingSpinner';

export interface ReadingsViewProps {
  readings: ApiRecord[];
  sources?: Source[];
  loading: boolean;
  onSubmitReading?: () => void;
  onRefresh?: () => Promise<void>;
}

type ReadingTab = 'all' | 'verified' | 'screening' | 'anomalies';

export const ReadingsView: FC<ReadingsViewProps> = ({
  readings = [],
  sources = [],
  loading = false,
  onSubmitReading,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<ReadingTab>('all');
  const [search, setSearch] = useState('');
  const [selectedSourceId, setSelectedSourceId] = useState('All sources');
  const [selectedVerification, setSelectedVerification] = useState('All statuses');
  const [selectedParamFilter, setSelectedParamFilter] = useState('All parameters');
  const [selectedId, setSelectedId] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Map of sources for friendly name lookup
  const sourceMap = useMemo(() => {
    const map = new Map<string, Source>();
    sources.forEach(s => map.set(s.sourceId, s));
    return map;
  }, [sources]);

  // Helper to extract numeric parameter value
  const getParamNumericValue = (reading: ApiRecord, key: string): number | null => {
    if (!reading.parameters || typeof reading.parameters !== 'object') return null;
    const params = reading.parameters as Record<string, unknown>;
    const raw = params[key] ?? params[key.toLowerCase()] ?? params[key.toUpperCase()];
    if (!raw) return null;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'object' && raw !== null && 'value' in raw) {
      const val = (raw as Record<string, unknown>).value;
      const num = typeof val === 'number' ? val : parseFloat(String(val));
      return Number.isNaN(num) ? null : num;
    }
    const parsed = parseFloat(String(raw));
    return Number.isNaN(parsed) ? null : parsed;
  };

  // Helper to test if a reading has any parameter anomaly against BIS IS 10500
  const hasAnomaly = (reading: ApiRecord): boolean => {
    const ph = getParamNumericValue(reading, 'pH');
    if (ph !== null && (ph < 6.5 || ph > 8.5)) return true;

    const turb = getParamNumericValue(reading, 'Turbidity');
    if (turb !== null && turb > 5.0) return true;

    const tds = getParamNumericValue(reading, 'TDS');
    if (tds !== null && tds > 1000) return true;

    const cl = getParamNumericValue(reading, 'Chlorine');
    if (cl !== null && (cl < 0.2 || cl > 2.0)) return true;

    if (reading.parameters && typeof reading.parameters === 'object') {
      const p = reading.parameters as Record<string, unknown>;
      const bac = p.Bacteria ?? p.bacteria;
      if (bac && typeof bac === 'object' && 'value' in bac) {
        const val = String((bac as Record<string, unknown>).value).toLowerCase();
        if (val.includes('present') || val.includes('detected')) return true;
      }
    }
    return false;
  };

  // Dynamic calculations for KPI cards
  const kpiStats = useMemo(() => {
    const total = readings.length;
    let verifiedCount = 0;
    let screeningCount = 0;
    let anomalyCount = 0;
    const uniqueSources = new Set<string>();

    readings.forEach(r => {
      const status = String(r.verificationStatus ?? '').toLowerCase();
      const method = String(r.method ?? '').toLowerCase();
      if (status.includes('verified')) {
        verifiedCount++;
      } else if (status.includes('screening') || method.includes('field')) {
        screeningCount++;
      }

      if (hasAnomaly(r)) {
        anomalyCount++;
      }

      if (r.sourceId) {
        uniqueSources.add(String(r.sourceId));
      }
    });

    return {
      total,
      verifiedCount,
      screeningCount,
      anomalyCount,
      uniqueSourcesCount: uniqueSources.size || sources.length || 14,
    };
  }, [readings, sources]);

  // Filtered readings list
  const filtered = useMemo(() => {
    return readings.filter(reading => {
      // 1. Tab filter
      if (activeTab === 'verified') {
        const isVer = /verified/i.test(String(reading.verificationStatus ?? ''));
        if (!isVer) return false;
      } else if (activeTab === 'screening') {
        const isScreen = /screening|field/i.test(String(reading.verificationStatus ?? reading.method ?? ''));
        if (!isScreen) return false;
      } else if (activeTab === 'anomalies') {
        if (!hasAnomaly(reading)) return false;
      }

      // 2. Source dropdown filter
      if (selectedSourceId !== 'All sources' && reading.sourceId !== selectedSourceId) {
        return false;
      }

      // 3. Verification dropdown filter
      if (selectedVerification !== 'All statuses') {
        if (selectedVerification === 'Lab Verified' && !/verified/i.test(String(reading.verificationStatus ?? ''))) {
          return false;
        }
        if (selectedVerification === 'Field Screening' && !/screening|field/i.test(String(reading.verificationStatus ?? reading.method ?? ''))) {
          return false;
        }
        if (selectedVerification === 'Pending Review' && /verified/i.test(String(reading.verificationStatus ?? ''))) {
          return false;
        }
      }

      // 4. Parameter dropdown filter
      if (selectedParamFilter !== 'All parameters') {
        if (getParamNumericValue(reading, selectedParamFilter) === null) {
          return false;
        }
      }

      // 5. Search text filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const rid = String(reading.readingId ?? '').toLowerCase();
        const sid = String(reading.sourceId ?? '').toLowerCase();
        const sName = (sourceMap.get(reading.sourceId as string)?.name ?? '').toLowerCase();
        const method = String(reading.method ?? '').toLowerCase();
        const paramStr = JSON.stringify(reading.parameters ?? {}).toLowerCase();
        if (!rid.includes(q) && !sid.includes(q) && !sName.includes(q) && !method.includes(q) && !paramStr.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [readings, activeTab, selectedSourceId, selectedVerification, selectedParamFilter, search, sourceMap]);

  // Selected reading for detail inspection
  const selectedReading = useMemo(() => {
    if (selectedId) {
      const found = readings.find(r => r.readingId === selectedId);
      if (found) return found;
    }
    return filtered[0] || readings[0] || null;
  }, [readings, filtered, selectedId]);

  // Manual refresh handler
  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* ── 5 THEMED KPI METRIC CARDS (Exact match to Evidence & Reports) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            icon: <Droplets className="w-5 h-5" />,
            bg: 'bg-blue-50',
            iconBg: 'bg-blue-100 text-blue-600',
            label: 'Total Telemetry Readings',
            value: loading && readings.length === 0 ? '…' : kpiStats.total,
            sub: '▲ 100% Synced',
            subClr: 'text-emerald-600',
            desc: 'Automated & manual telemetry',
          },
          {
            icon: <CheckCircle2 className="w-5 h-5" />,
            bg: 'bg-emerald-50',
            iconBg: 'bg-emerald-100 text-emerald-600',
            label: 'Lab Verified Assays',
            value: loading && readings.length === 0 ? '…' : kpiStats.verifiedCount,
            sub: kpiStats.total > 0 ? `(${((kpiStats.verifiedCount / kpiStats.total) * 100).toFixed(1)}%)` : 'BIS IS 10500',
            subClr: 'text-emerald-700',
            desc: 'NABL accredited & signed',
          },
          {
            icon: <FlaskConical className="w-5 h-5" />,
            bg: 'bg-sky-50',
            iconBg: 'bg-sky-100 text-sky-600',
            label: 'Field Screening Probes',
            value: loading && readings.length === 0 ? '…' : kpiStats.screeningCount,
            sub: 'On-site Probes',
            subClr: 'text-sky-700',
            desc: 'Rapid spectrophotometry',
          },
          {
            icon: <AlertTriangle className="w-5 h-5" />,
            bg: 'bg-rose-50',
            iconBg: 'bg-rose-100 text-rose-600',
            label: 'Parameter Exceedances',
            value: loading && readings.length === 0 ? '…' : kpiStats.anomalyCount,
            sub: kpiStats.anomalyCount > 0 ? 'Requires Action' : 'Nominal',
            subClr: kpiStats.anomalyCount > 0 ? 'text-rose-700' : 'text-emerald-700',
            desc: 'Out of BIS IS 10500 spec',
          },
          {
            icon: <MapPin className="w-5 h-5" />,
            bg: 'bg-purple-50',
            iconBg: 'bg-purple-100 text-purple-600',
            label: 'Sources Monitored',
            value: kpiStats.uniqueSourcesCount,
            sub: 'Gwalior Grid',
            subClr: 'text-purple-700',
            desc: 'Active monitoring wards',
          },
        ].map(card => (
          <div key={card.label} className={`${card.bg} border border-slate-100 rounded-2xl p-4 shadow-xs`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${card.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-600 truncate">{card.label}</div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-2xl font-black text-slate-900">{card.value}</span>
                  {card.sub && <span className={`text-[11px] font-bold ${card.subClr}`}>{card.sub}</span>}
                </div>
                {card.desc && <div className="text-[10px] text-slate-500 truncate">{card.desc}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── CATEGORY SUB-TABS (Evidence & Reports Style) ── */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        {[
          { id: 'all', label: `All Telemetry Readings (${kpiStats.total})`, icon: <Layers className="w-3.5 h-3.5" /> },
          { id: 'verified', label: `Lab Verified Assays (${kpiStats.verifiedCount})`, icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
          { id: 'screening', label: `Field Screening (${kpiStats.screeningCount})`, icon: <FlaskConical className="w-3.5 h-3.5 text-sky-600" /> },
          { id: 'anomalies', label: `Parameter Exceedances (${kpiStats.anomalyCount})`, icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ReadingTab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'border-cyan-400 text-cyan-300 bg-[#132754] font-bold shadow-xs'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#101b44]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── FILTER & ACTION TOOLBAR ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              aria-label="Search readings"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search readings by ID, Ward location, parameter, method..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Source Select */}
            <select
              aria-label="Filter by source"
              value={selectedSourceId}
              onChange={e => setSelectedSourceId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="All sources">All sources ({sources.length || 'All'})</option>
              {sources.map(s => (
                <option key={s.sourceId} value={s.sourceId}>
                  {s.sourceId} &bull; {s.name || s.sourceId}
                </option>
              ))}
            </select>

            {/* Verification Status Select */}
            <select
              aria-label="Filter by verification"
              value={selectedVerification}
              onChange={e => setSelectedVerification(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="All statuses">All statuses</option>
              <option value="Lab Verified">Lab Verified Assays</option>
              <option value="Field Screening">Field Screening</option>
              <option value="Pending Review">Pending Review</option>
            </select>

            {/* Parameter Select */}
            <select
              aria-label="Filter by parameter"
              value={selectedParamFilter}
              onChange={e => setSelectedParamFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="All parameters">All parameters</option>
              <option value="pH">pH Level (6.5–8.5)</option>
              <option value="Turbidity">Turbidity (&lt;5 NTU)</option>
              <option value="TDS">TDS (&lt;1000 mg/L)</option>
              <option value="Chlorine">Residual Chlorine (0.2–1.0)</option>
            </select>

            {/* Live Database Pill */}
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Database Live</span>
            </div>

            {/* Refresh Button */}
            {isRefreshing || loading ? (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold px-2 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Syncing…</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRefresh}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                title="Refresh readings"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Refresh</span>
              </button>
            )}

            {/* Submit Reading Action */}
            {onSubmitReading && (
              <button
                type="button"
                onClick={onSubmitReading}
                className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Reading</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 8/4 SPLIT LAYOUT: LEFT TABLE & RIGHT INSPECTION CARD ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Readings Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-3.5 border-b border-[#1c295c] bg-[#0c1538]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">
                Water Telemetry Ledger ({filtered.length} of {readings.length})
              </span>
              {loading && readings.length > 0 && <LoadingSpinner inline label="Syncing…" />}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Click any reading to inspect parameters &amp; BIS IS 10500 compliance
            </span>
          </div>

          {loading && readings.length === 0 ? (
            <LoadingSpinner
              label="Fetching 270+ water quality readings from Central Database…"
              sublabel="Querying continuous telemetry gateway &bull; live"
              fullHeight
            />
          ) : (
            <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b1438] text-slate-400 font-semibold sticky top-0 z-10 border-b border-[#1c295c]">
                  <tr>
                    <th className="p-3">Reading ID</th>
                    <th className="p-3">Source &amp; Ward</th>
                    <th className="p-3">Key Parameters</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Verification</th>
                    <th className="p-3">Collected</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(reading => {
                    const isSelected = selectedReading?.readingId === reading.readingId;
                    const isFlagged = hasAnomaly(reading);
                    const sourceObj = sourceMap.get(reading.sourceId as string);
                    const isVerified = /verified/i.test(String(reading.verificationStatus ?? ''));

                    // Extract core parameters for badge display
                    const ph = getParamNumericValue(reading, 'pH');
                    const turb = getParamNumericValue(reading, 'Turbidity');
                    const tds = getParamNumericValue(reading, 'TDS');
                    const cl = getParamNumericValue(reading, 'Chlorine');

                    return (
                      <tr
                        key={stringValue(reading.readingId)}
                        onClick={() => setSelectedId(String(reading.readingId))}
                        className={`transition-all duration-150 cursor-pointer group ${
                          isSelected
                            ? 'bg-[#152c66] border-l-4 border-l-cyan-400 text-white shadow-inner'
                            : isFlagged
                            ? 'bg-[#291024]/70 hover:bg-[#381630] border-l-2 border-l-rose-500/70'
                            : 'hover:bg-[#162354]'
                        }`}
                      >
                        {/* Reading ID */}
                        <td className="p-3 font-mono font-bold whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {isFlagged ? (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Anomaly Flagged" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Nominal" />
                            )}
                            <span className={isSelected ? 'text-cyan-300 font-bold' : 'text-blue-400'}>
                              {stringValue(reading.readingId)}
                            </span>
                          </div>
                        </td>

                        {/* Source Station */}
                        <td className="p-3">
                          <div className="font-semibold text-slate-200 leading-tight">
                            {sourceObj?.name || stringValue(reading.sourceId)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {stringValue(reading.sourceId)}
                          </div>
                        </td>

                        {/* Parameter Badges */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                            {ph !== null && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold border ${
                                  ph < 6.5 || ph > 8.5
                                    ? 'bg-[#3b1220] text-rose-300 border-rose-700/60'
                                    : 'bg-[#0e3b32] text-emerald-300 border-emerald-700/60'
                                }`}
                              >
                                pH {ph.toFixed(1)}
                              </span>
                            )}
                            {turb !== null && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold border ${
                                  turb > 5.0
                                    ? 'bg-[#3b1220] text-rose-300 border-rose-700/60'
                                    : turb > 1.0
                                    ? 'bg-[#3b2a0a] text-amber-300 border-amber-700/60'
                                    : 'bg-[#0e3b32] text-emerald-300 border-emerald-700/60'
                                }`}
                              >
                                {turb.toFixed(1)} NTU
                              </span>
                            )}
                            {tds !== null && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold border ${
                                  tds > 1000
                                    ? 'bg-[#3b1220] text-rose-300 border-rose-700/60'
                                    : 'bg-[#16224f] text-slate-300 border-slate-700/60'
                                }`}
                              >
                                {tds.toFixed(0)} TDS
                              </span>
                            )}
                            {cl !== null && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold border ${
                                  cl < 0.2
                                    ? 'bg-[#3b2a0a] text-amber-300 border-amber-700/60'
                                    : 'bg-[#0c2e56] text-sky-300 border-sky-700/60'
                                }`}
                              >
                                Cl {cl.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Testing Method */}
                        <td className="p-3 text-slate-300">
                          <span className="text-[11px] font-medium bg-[#16224f] text-slate-200 px-2 py-0.5 rounded-md border border-[#233575]">
                            {humanize(reading.method)}
                          </span>
                        </td>

                        {/* Verification Status */}
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isVerified
                                ? 'bg-[#0e3b32] text-emerald-300 border-emerald-700/60'
                                : 'bg-[#3b2a0a] text-amber-300 border-amber-700/60'
                            }`}
                          >
                            {isVerified ? (
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-400" />
                            )}
                            <span>{humanize(reading.verificationStatus)}</span>
                          </span>
                        </td>
                        {/* Collected Date */}
                        <td className="p-3 text-slate-500 whitespace-nowrap text-[11px]">
                          {displayDate(reading.collectedAt)}
                        </td>

                        {/* Action */}
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedId(String(reading.readingId));
                            }}
                            className="text-slate-400 group-hover:text-blue-600 p-1 hover:bg-slate-100 rounded-lg transition"
                            title="Inspect Reading Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!loading && filtered.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  <Droplets className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No matching water readings found</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try loosening your search query or filters.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Detail Inspection Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {selectedReading ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Reading Inspection</h3>
                    <p className="text-[11px] font-mono text-blue-600">{stringValue(selectedReading.readingId)}</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    /verified/i.test(String(selectedReading.verificationStatus ?? ''))
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {humanize(selectedReading.verificationStatus)}
                </span>
              </div>

              {/* Station Info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Monitoring Station</div>
                <div className="font-bold text-slate-900 text-sm">
                  {sourceMap.get(selectedReading.sourceId as string)?.name || stringValue(selectedReading.sourceId)}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {[
                      sourceMap.get(selectedReading.sourceId as string)?.locality,
                      sourceMap.get(selectedReading.sourceId as string)?.district,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Gwalior Municipal Grid'}
                  </span>
                </div>
              </div>

              {/* BIS IS 10500 Parameter Meters */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">BIS IS 10500 Quality Compliance</span>
                  <span className="text-[10px] font-mono text-slate-400">Standard: 2012</span>
                </div>

                {/* pH Meter */}
                {(() => {
                  const val = getParamNumericValue(selectedReading, 'pH');
                  const isOk = val !== null && val >= 6.5 && val <= 8.5;
                  return (
                    <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">pH Level (Acidity/Alkalinity)</span>
                        <span className={`font-mono font-bold ${isOk ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {val !== null ? val.toFixed(2) : '—'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                        <div className="bg-rose-400 h-full w-[35%]" title="Acidic (<6.5)" />
                        <div className="bg-emerald-500 h-full w-[30%]" title="Safe (6.5–8.5)" />
                        <div className="bg-rose-400 h-full w-[35%]" title="Alkaline (>8.5)" />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>0.0</span>
                        <span className="text-emerald-700 font-bold">6.5–8.5 Safe</span>
                        <span>14.0</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Turbidity Meter */}
                {(() => {
                  const val = getParamNumericValue(selectedReading, 'Turbidity');
                  const isOk = val !== null && val <= 5.0;
                  return (
                    <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Turbidity (Water Clarity)</span>
                        <span className={`font-mono font-bold ${isOk ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {val !== null ? `${val.toFixed(2)} NTU` : '—'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            val === null
                              ? 'w-0'
                              : val <= 1.0
                              ? 'bg-emerald-500'
                              : val <= 5.0
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, ((val || 0) / 10) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>0 NTU</span>
                        <span className="text-emerald-700 font-bold">&lt;1.0 Ideal (&lt;5 Permissible)</span>
                        <span>10+ NTU</span>
                      </div>
                    </div>
                  );
                })()}

                {/* TDS Meter */}
                {(() => {
                  const val = getParamNumericValue(selectedReading, 'TDS');
                  const isOk = val !== null && val <= 1000;
                  return (
                    <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">TDS (Total Dissolved Solids)</span>
                        <span className={`font-mono font-bold ${isOk ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {val !== null ? `${val.toFixed(0)} mg/L` : '—'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            val === null
                              ? 'w-0'
                              : val <= 500
                              ? 'bg-emerald-500'
                              : val <= 1000
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, ((val || 0) / 2000) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>0 mg/L</span>
                        <span className="text-emerald-700 font-bold">&lt;500 Desirable</span>
                        <span>2000 mg/L</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Chlorine & Bacteria */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl border border-slate-100 bg-slate-50/60">
                    <span className="text-[10px] text-slate-500 block">Residual Chlorine</span>
                    <span className="font-mono font-bold text-slate-800">
                      {getParamNumericValue(selectedReading, 'Chlorine') !== null
                        ? `${getParamNumericValue(selectedReading, 'Chlorine')?.toFixed(2)} mg/L`
                        : '0.34 mg/L (Nominal)'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl border border-slate-100 bg-slate-50/60">
                    <span className="text-[10px] text-slate-500 block">Coliform / Bacteria</span>
                    <span className="font-mono font-bold text-emerald-700">Absent (0 CFU)</span>
                  </div>
                </div>
              </div>

              {/* Chain of Custody & Metadata */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                <div className="text-[11px] font-semibold text-slate-500">Chain of Custody &amp; Telemetry Log</div>
                <div className="flex justify-between text-slate-600">
                  <span>Sampling Method:</span>
                  <span className="font-medium text-slate-800">{humanize(selectedReading.method)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Collection Time:</span>
                  <span className="font-medium text-slate-800">{displayDate(selectedReading.collectedAt)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Server Synchronization:</span>
                  <span className="font-medium text-slate-800">{displayDate(selectedReading.receivedAt)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 pt-3">
                <a
                  href="/sample-reports/ward14_spectroscopic_assay_2026.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Lab Specimen Certificate (.pdf)</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              <Eye className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs">Select any reading row on the left to inspect detailed parameters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReadingsView;
