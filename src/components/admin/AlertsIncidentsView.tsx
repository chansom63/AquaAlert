import { useMemo, useState } from 'react';
import type { FC } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Edit,
  Flame,
  Layers,
  Loader2,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import type { Alert, Source } from '../../types/water';
import { displayDate, humanize, stringValue } from '../../api/adminRecords';
import { LoadingSpinner } from '../common/LoadingSpinner';

export interface AlertsIncidentsViewProps {
  alerts: Alert[];
  sources: Source[];
  loading: boolean;
  onSelectAlert?: (alertId: string) => void;
  onRefresh?: () => Promise<void>;
  onCreateAlert?: (alert: Partial<Alert>) => Promise<Alert>;
  onUpdateAlert?: (alertId: string, updates: Partial<Alert>) => Promise<Alert>;
  onDeleteAlert?: (alertId: string) => Promise<void>;
}

type AlertTab = 'all' | 'critical' | 'active' | 'resolved';

export const AlertsIncidentsView: FC<AlertsIncidentsViewProps> = ({
  alerts = [],
  sources = [],
  loading = false,
  onSelectAlert,
  onRefresh,
  onCreateAlert,
  onUpdateAlert,
  onDeleteAlert,
}) => {
  const [activeTab, setActiveTab] = useState<AlertTab>('all');
  const [search, setSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('All severities');
  const [selectedState, setSelectedState] = useState('All states');
  const [selectedSourceId, setSelectedSourceId] = useState('All sources');
  const [selectedId, setSelectedId] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // CRUD states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [deletingAlert, setDeletingAlert] = useState<Alert | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!onCreateAlert) return;
    setIsSubmitting(true);
    const form = new FormData(e.currentTarget);
    const sourceId = String(form.get('sourceId') || (sources[0]?.sourceId ?? 'SRC-001'));
    const severity = String(form.get('severity') || 'WARNING') as Alert['severity'];
    const state = String(form.get('state') || 'OPEN') as Alert['state'];
    const reason = String(form.get('reason') || 'Manual municipal incident declared');
    const publicMessage = String(form.get('publicMessage') || reason);

    const newAlt: Partial<Alert> = {
      alertId: `ALT-${Date.now().toString(36).toUpperCase()}`,
      sourceId,
      severity,
      state,
      reason,
      publicMessage,
      createdAt: new Date().toISOString(),
    };

    try {
      await onCreateAlert(newAlt);
      setActionFeedback(`Incident alert ${newAlt.alertId} declared successfully!`);
      setShowAddModal(false);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!onUpdateAlert || !editingAlert) return;
    setIsSubmitting(true);
    const form = new FormData(e.currentTarget);
    const updates: Partial<Alert> = {
      severity: String(form.get('severity') || editingAlert.severity) as Alert['severity'],
      state: String(form.get('state') || editingAlert.state) as Alert['state'],
      reason: String(form.get('reason') || editingAlert.reason),
      publicMessage: String(form.get('publicMessage') || editingAlert.publicMessage),
    };

    try {
      await onUpdateAlert(editingAlert.alertId, updates);
      setActionFeedback(`Alert ${editingAlert.alertId} updated successfully!`);
      setEditingAlert(null);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!onDeleteAlert || !deletingAlert) return;
    setIsSubmitting(true);
    try {
      await onDeleteAlert(deletingAlert.alertId);
      setActionFeedback(`Alert ${deletingAlert.alertId} dismissed & archived.`);
      if (selectedId === deletingAlert.alertId) setSelectedId('');
      setDeletingAlert(null);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Source map for quick lookups
  const sourceMap = useMemo(() => {
    const map = new Map<string, Source>();
    sources.forEach(s => map.set(s.sourceId, s));
    return map;
  }, [sources]);

  // Distinct lists for dropdowns
  const severities = useMemo(() => {
    const set = new Set<string>();
    alerts.forEach(a => {
      if (a.severity) set.add(String(a.severity));
    });
    return Array.from(set);
  }, [alerts]);

  const states = useMemo(() => {
    const set = new Set<string>();
    alerts.forEach(a => {
      if (a.state) set.add(String(a.state));
    });
    return Array.from(set);
  }, [alerts]);

  const impactedSources = useMemo(() => {
    const set = new Set<string>();
    alerts.forEach(a => {
      if (a.sourceId) set.add(String(a.sourceId));
    });
    return Array.from(set);
  }, [alerts]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const total = alerts.length;
    let criticalCount = 0;
    let activeCount = 0;
    let resolvedCount = 0;
    const sourceIds = new Set<string>();

    alerts.forEach(a => {
      const sev = String(a.severity ?? '').toLowerCase();
      const st = String(a.state ?? '').toLowerCase();

      if (sev.includes('critical') || sev.includes('high')) {
        criticalCount++;
      }
      if (st.includes('open') || st.includes('active') || st.includes('investigating')) {
        activeCount++;
      }
      if (st.includes('resolved') || st.includes('closed') || st.includes('cleared')) {
        resolvedCount++;
      }
      if (a.sourceId) {
        sourceIds.add(String(a.sourceId));
      }
    });

    return {
      total,
      criticalCount,
      activeCount,
      resolvedCount,
      wardsAffected: sourceIds.size,
    };
  }, [alerts]);

  // Filtered alerts
  const filtered = useMemo(() => {
    return alerts.filter(alert => {
      // 1. Tab filter
      const sev = String(alert.severity ?? '').toLowerCase();
      const st = String(alert.state ?? '').toLowerCase();

      if (activeTab === 'critical' && !sev.includes('critical') && !sev.includes('high')) return false;
      if (activeTab === 'active' && !st.includes('open') && !st.includes('active') && !st.includes('investigating')) return false;
      if (activeTab === 'resolved' && !st.includes('resolved') && !st.includes('closed') && !st.includes('cleared')) return false;

      // 2. Severity filter
      if (selectedSeverity !== 'All severities' && alert.severity !== selectedSeverity) return false;

      // 3. State filter
      if (selectedState !== 'All states' && alert.state !== selectedState) return false;

      // 4. Source filter
      if (selectedSourceId !== 'All sources' && alert.sourceId !== selectedSourceId) return false;

      // 5. Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const id = String(alert.alertId ?? '').toLowerCase();
        const sid = String(alert.sourceId ?? '').toLowerCase();
        const sName = (sourceMap.get(alert.sourceId)?.name ?? '').toLowerCase();
        const reason = String(alert.reason ?? alert.publicMessage ?? '').toLowerCase();
        if (!id.includes(q) && !sid.includes(q) && !sName.includes(q) && !reason.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [alerts, activeTab, selectedSeverity, selectedState, selectedSourceId, search, sourceMap]);

  // Selected Alert for right detail pane
  const selectedAlert = useMemo(() => {
    if (selectedId) {
      const found = alerts.find(a => a.alertId === selectedId);
      if (found) return found;
    }
    return filtered[0] || alerts[0] || null;
  }, [alerts, filtered, selectedId]);

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
            icon: <Layers className="w-5 h-5" />,
            bg: 'bg-blue-50',
            iconBg: 'bg-blue-100 text-blue-600',
            label: 'Total Incidents Logged',
            value: loading && alerts.length === 0 ? '…' : kpiStats.total,
            sub: 'Incident Ledger',
            subClr: 'text-blue-600',
            desc: 'Continuous surveillance history',
          },
          {
            icon: <Flame className="w-5 h-5" />,
            bg: 'bg-rose-50',
            iconBg: 'bg-rose-100 text-rose-600',
            label: 'Critical Severity Urgency',
            value: loading && alerts.length === 0 ? '…' : kpiStats.criticalCount,
            sub: kpiStats.criticalCount > 0 ? 'Urgent Action' : 'Nominal',
            subClr: kpiStats.criticalCount > 0 ? 'text-rose-700' : 'text-emerald-700',
            desc: 'Immediate public health risk',
          },
          {
            icon: <AlertTriangle className="w-5 h-5" />,
            bg: 'bg-amber-50',
            iconBg: 'bg-amber-100 text-amber-600',
            label: 'Active & Investigating',
            value: loading && alerts.length === 0 ? '…' : kpiStats.activeCount,
            sub: 'Field Crews Dispatched',
            subClr: 'text-amber-700',
            desc: 'Under active mitigation',
          },
          {
            icon: <CheckCircle2 className="w-5 h-5" />,
            bg: 'bg-emerald-50',
            iconBg: 'bg-emerald-100 text-emerald-600',
            label: 'Resolved & Cleared',
            value: loading && alerts.length === 0 ? '…' : kpiStats.resolvedCount,
            sub: 'Safe Restoration',
            subClr: 'text-emerald-700',
            desc: 'Post-flush lab verified',
          },
          {
            icon: <MapPin className="w-5 h-5" />,
            bg: 'bg-purple-50',
            iconBg: 'bg-purple-100 text-purple-600',
            label: 'Impacted Ward Sources',
            value: kpiStats.wardsAffected,
            sub: 'Gwalior Grid',
            subClr: 'text-purple-700',
            desc: 'Surveillance containment zones',
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
          { id: 'all', label: `All Incidents (${kpiStats.total})`, icon: <Layers className="w-3.5 h-3.5" /> },
          { id: 'critical', label: `Critical Urgency (${kpiStats.criticalCount})`, icon: <Flame className="w-3.5 h-3.5 text-rose-600" /> },
          { id: 'active', label: `Active & Investigating (${kpiStats.activeCount})`, icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> },
          { id: 'resolved', label: `Resolved & Cleared (${kpiStats.resolvedCount})`, icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AlertTab)}
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
              aria-label="Search alerts"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search incidents by Alert ID, Ward, severity, reason..."
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
            {/* Severity Select */}
            <select
              aria-label="Filter by severity"
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="All severities">All Severities</option>
              {severities.map(s => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </select>

            {/* State Select */}
            <select
              aria-label="Filter by incident state"
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="All states">All Incident States</option>
              {states.map(s => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </select>

            {/* Source Select */}
            <select
              aria-label="Filter by source"
              value={selectedSourceId}
              onChange={e => setSelectedSourceId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="All sources">All Sources</option>
              {impactedSources.map(s => (
                <option key={s} value={s}>
                  {s} &bull; {sourceMap.get(s)?.name || s}
                </option>
              ))}
            </select>

            {/* Live Database Pill */}
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Surveillance Live</span>
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
                title="Refresh alerts"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Refresh</span>
              </button>
            )}

            {/* Declare Incident Button */}
            {onCreateAlert && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Declare Incident</span>
              </button>
            )}
          </div>
        </div>

        {/* Action feedback notice */}
        {actionFeedback && (
          <div className="mt-2.5 px-3 py-2 bg-emerald-900/60 border border-emerald-500/50 text-emerald-200 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{actionFeedback}</span>
            </div>
            <button onClick={() => setActionFeedback(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── 8/4 SPLIT LAYOUT: LEFT TABLE & RIGHT INSPECTION CARD ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Alerts Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-3.5 border-b border-[#1c295c] bg-[#0c1538]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">
                Water Advisory &amp; Incident Ledger ({filtered.length} of {alerts.length})
              </span>
              {loading && alerts.length > 0 && <LoadingSpinner inline label="Refreshing alerts…" />}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Click any incident to open full dossier &amp; trigger mitigation
            </span>
          </div>

          {loading && alerts.length === 0 ? (
            <LoadingSpinner
              label="Fetching alerts & incident surveillance from Central Database…"
              sublabel="Querying active water advisories &bull; live"
              fullHeight
            />
          ) : (
            <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b1438] text-slate-400 font-semibold sticky top-0 z-10 border-b border-[#1c295c]">
                  <tr>
                    <th className="p-3">Alert ID</th>
                    <th className="p-3">Affected Source &amp; Ward</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">State</th>
                    <th className="p-3">Public Advisory &amp; Root Cause</th>
                    <th className="p-3">Issued Date</th>
                    <th className="p-3 text-right">Dossier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(alert => {
                    const isSelected = selectedAlert?.alertId === alert.alertId;
                    const isCritical = /critical|high/i.test(alert.severity ?? '');
                    const isWarning = /warning|medium/i.test(alert.severity ?? '');
                    const isResolved = /resolved|closed|cleared/i.test(alert.state ?? '');
                    const sourceObj = sourceMap.get(alert.sourceId);

                    return (
                      <tr
                        key={alert.alertId}
                        onClick={() => setSelectedId(alert.alertId)}
                        className={`transition-all duration-150 cursor-pointer group ${
                          isSelected
                            ? 'bg-[#152c66] border-l-4 border-l-cyan-400 text-white shadow-inner'
                            : isCritical
                            ? 'bg-[#291024]/70 hover:bg-[#381630] border-l-2 border-l-rose-500/70'
                            : 'hover:bg-[#162354]'
                        }`}
                      >
                        {/* Alert ID */}
                        <td className="p-3 font-mono font-bold whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {isCritical ? (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            ) : isWarning ? (
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            )}
                            <span className={isSelected ? 'text-cyan-300 font-bold' : 'text-blue-400'}>
                              {alert.alertId}
                            </span>
                          </div>
                        </td>

                        {/* Source Station */}
                        <td className="p-3">
                          <div className="font-semibold text-slate-200 leading-tight">
                            {sourceObj?.name || alert.sourceId}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {alert.sourceId} &bull; {sourceObj?.locality || 'Gwalior Grid'}
                          </div>
                        </td>

                        {/* Severity */}
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isCritical
                                ? 'bg-[#3b1220] text-rose-300 border-rose-700/60'
                                : isWarning
                                ? 'bg-[#3b2a0a] text-amber-300 border-amber-700/60'
                                : 'bg-[#0c2e56] text-sky-300 border-sky-700/60'
                            }`}
                          >
                            {isCritical && <Flame className="w-3 h-3 text-rose-400" />}
                            {humanize(alert.severity)}
                          </span>
                        </td>

                        {/* State */}
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                              isResolved
                                ? 'bg-[#0e3b32] text-emerald-300 border-emerald-700/60'
                                : /investigating/i.test(alert.state ?? '')
                                ? 'bg-[#3b2a0a] text-amber-300 border-amber-700/60'
                                : 'bg-[#3b1220] text-rose-300 border-rose-700/60'
                            }`}
                          >
                            {humanize(alert.state)}
                          </span>
                        </td>

                        {/* Reason / Public Message */}
                        <td className="p-3 text-slate-800 max-w-xs">
                          <p className="line-clamp-2 text-xs leading-snug">
                            {stringValue(alert.reason, stringValue(alert.publicMessage))}
                          </p>
                        </td>

                        {/* Timestamp */}
                        <td className="p-3 text-slate-400 whitespace-nowrap text-[11px]">
                          {displayDate(alert.createdAt ?? alert.issuedAt)}
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {onUpdateAlert && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setEditingAlert(alert);
                                }}
                                className="text-slate-400 hover:text-cyan-300 p-1 hover:bg-[#162758] rounded-lg transition"
                                title="Update Incident Status"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteAlert && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setDeletingAlert(alert);
                                }}
                                className="text-slate-400 hover:text-rose-400 p-1 hover:bg-[#381622] rounded-lg transition"
                                title="Dismiss / Delete Incident Alert"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                if (onSelectAlert) onSelectAlert(alert.alertId);
                                else setSelectedId(alert.alertId);
                              }}
                              className="text-slate-400 hover:text-blue-400 p-1 hover:bg-[#162758] rounded-lg transition"
                              title="Open Incident Drawer"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!loading && filtered.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No matching incident alerts found</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try selecting a different severity or clearing filters.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Detail Inspection Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {selectedAlert ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                      /critical|high/i.test(selectedAlert.severity ?? '')
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Incident Brief</h3>
                    <p className="text-[11px] font-mono text-blue-600">{selectedAlert.alertId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      /critical|high/i.test(selectedAlert.severity ?? '')
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {humanize(selectedAlert.severity)}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      /resolved|closed/i.test(selectedAlert.state ?? '')
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {humanize(selectedAlert.state)}
                  </span>
                </div>
              </div>

              {/* Station Info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Contaminated / Impacted Facility
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {sourceMap.get(selectedAlert.sourceId)?.name || selectedAlert.sourceId}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {[
                      sourceMap.get(selectedAlert.sourceId)?.locality,
                      sourceMap.get(selectedAlert.sourceId)?.district,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Gwalior Municipal Grid'}
                  </span>
                </div>
              </div>

              {/* Public Notice Box */}
              <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200 space-y-1.5">
                <div className="text-[11px] font-bold text-rose-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Public Health Water Advisory</span>
                </div>
                <p className="text-xs text-rose-900 leading-relaxed">
                  {selectedAlert.publicMessage || selectedAlert.reason}
                </p>
              </div>

              {/* Root Cause & Engineering Protocol */}
              <div className="space-y-2 text-xs">
                <div className="font-bold text-slate-800">Operational Response Protocol:</div>
                <ul className="space-y-1 text-slate-600 list-disc list-inside text-[11px]">
                  <li>Deploy field inspection unit for on-site reagent titration.</li>
                  <li>Increase chlorination booster dosing at feeder injection point.</li>
                  <li>Order distribution scour flush if turbidity &gt;5 NTU persists.</li>
                  <li>Collect confirmatory laboratory specimen for incubation.</li>
                </ul>
              </div>

              {/* Incident Metadata */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Incident Registered:</span>
                  <span className="font-medium text-slate-900">
                    {displayDate(selectedAlert.createdAt ?? selectedAlert.issuedAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Advisory Standard:</span>
                  <span className="font-medium text-slate-900">BIS IS 10500:2012 Drinking Water</span>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {onUpdateAlert && (
                    <button
                      type="button"
                      onClick={() => setEditingAlert(selectedAlert)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#132754] hover:bg-[#1a3574] text-cyan-300 font-bold rounded-xl text-xs border border-[#22448f] transition cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Update Status</span>
                    </button>
                  )}
                  {onDeleteAlert && (
                    <button
                      type="button"
                      onClick={() => setDeletingAlert(selectedAlert)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#33111e] hover:bg-[#48182b] text-rose-300 font-bold rounded-xl text-xs border border-rose-800/60 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Dismiss Alert</span>
                    </button>
                  )}
                </div>

                {onSelectAlert && (
                  <button
                    type="button"
                    onClick={() => onSelectAlert(selectedAlert.alertId)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                  >
                    <span>Open Comprehensive Incident Dossier &rarr;</span>
                  </button>
                )}

                <a
                  href="/sample-reports/ward28_chlorine_depletion_investigation.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Incident Report (.pdf)</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              <AlertTriangle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs">Select any incident row to view advisory details.</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CRUD MODALS FOR ALERTS & INCIDENTS                                        */}
      {/* ========================================================================= */}

      {/* 1. Declare Incident / Create Alert Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0c1938] border border-[#1c295c] rounded-2xl shadow-2xl max-w-xl w-full p-6 text-white animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c295c]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-600/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <Flame className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Declare Municipal Incident / Water Advisory</h3>
                  <p className="text-[11px] text-slate-400">Initiate immediate response protocol & public health bulletin</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#162758] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Target Water Source</label>
                  <select
                    name="sourceId"
                    required
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    {sources.map(s => (
                      <option key={s.sourceId} value={s.sourceId}>
                        {s.name} ({s.sourceId})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Severity Level</label>
                  <select
                    name="severity"
                    defaultValue="WARNING"
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="CRITICAL">CRITICAL (Direct Contamination / Red Alert)</option>
                    <option value="HIGH">HIGH (Advisory Threshold Breach)</option>
                    <option value="WARNING">WARNING (Precautionary Surveillance)</option>
                    <option value="INFO">INFO (Operational Notice)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Incident State</label>
                <select
                  name="state"
                  defaultValue="OPEN"
                  className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                >
                  <option value="OPEN">OPEN (Under immediate triage)</option>
                  <option value="INVESTIGATING">INVESTIGATING (Field team deployed)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Anomaly Reason / Root Cause</label>
                <input
                  name="reason"
                  placeholder="e.g. Free Residual Chlorine dropped to 0.05 mg/L at Ward 28 Feeder"
                  required
                  className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Public Health Advisory Message</label>
                <textarea
                  name="publicMessage"
                  rows={2}
                  placeholder="e.g. Precautionary boil water advisory active. Distribution flushing underway."
                  className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#1c295c] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-[#152347] hover:bg-[#1c3060] text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                  <span>Publish Alert &amp; Notify Dispatch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Update Alert Modal */}
      {editingAlert && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0c1938] border border-[#1c295c] rounded-2xl shadow-2xl max-w-xl w-full p-6 text-white animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c295c]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Update Incident Advisory ({editingAlert.alertId})</h3>
                  <p className="text-[11px] text-slate-400">Modify lifecycle status, severity and engineering notes</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAlert(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#162758] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Severity</label>
                  <select
                    name="severity"
                    defaultValue={editingAlert.severity || 'WARNING'}
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="WARNING">WARNING</option>
                    <option value="INFO">INFO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Lifecycle State</label>
                  <select
                    name="state"
                    defaultValue={editingAlert.state || 'OPEN'}
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="OPEN">OPEN (Active Hazard)</option>
                    <option value="INVESTIGATING">INVESTIGATING (Mitigation Underway)</option>
                    <option value="RESOLVED">RESOLVED (Quality Restored)</option>
                    <option value="DISMISSED">DISMISSED (False Alarm / Archive)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Reason / Diagnosis</label>
                <input
                  name="reason"
                  defaultValue={editingAlert.reason}
                  required
                  className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Public Health Bulletin Message</label>
                <textarea
                  name="publicMessage"
                  defaultValue={editingAlert.publicMessage || editingAlert.reason}
                  rows={2}
                  className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#1c295c] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAlert(null)}
                  className="px-4 py-2 bg-[#152347] hover:bg-[#1c3060] text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Dismiss / Delete Alert Confirmation Modal */}
      {deletingAlert && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0c1938] border border-rose-900/60 rounded-2xl shadow-2xl max-w-md w-full p-6 text-white animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-900/50 text-rose-400 flex items-center justify-center border border-rose-700/60 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Dismiss &amp; Archive Incident Alert</h3>
                <p className="text-[11px] text-rose-300 font-mono">{deletingAlert.alertId}</p>
              </div>
            </div>

            <p className="mt-3.5 text-xs text-slate-300 leading-relaxed">
              Are you sure you want to dismiss alert <strong className="text-white">{deletingAlert.alertId}</strong>?
              This will remove the active advisory notice for source{' '}
              <span className="font-mono text-cyan-300">{deletingAlert.sourceId}</span> and archive the incident from
              the operational dashboard.
            </p>

            <div className="mt-5 pt-3 border-t border-[#1c295c] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingAlert(null)}
                className="px-4 py-2 bg-[#152347] hover:bg-[#1c3060] text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Confirm Dismissal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsIncidentsView;
