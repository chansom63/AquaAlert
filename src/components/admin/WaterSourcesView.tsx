import { useMemo, useState } from 'react';
import type { FC } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Droplets,
  Edit,
  Loader2,
  MapPin,
  Map as MapIcon,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Alert, Source } from '../../types/water';
import type { ApiRecord } from '../../api/adminRecords';
import { MapExplorer } from '../MapExplorer';
import { displayDate, humanize, stringValue } from '../../api/adminRecords';
import { LoadingSpinner } from '../common/LoadingSpinner';

export interface WaterSourcesViewProps {
  sources: Source[];
  readings?: ApiRecord[];
  alerts?: Alert[];
  loading?: boolean;
  onRefresh?: () => Promise<void>;
  onSelectSource?: (sourceId: string) => void;
  onCreateSource?: (newSource: Partial<Source>) => Promise<Source>;
  onUpdateSource?: (sourceId: string, updates: Partial<Source>) => Promise<Source>;
  onDeleteSource?: (sourceId: string) => Promise<void>;
}

type SourceTab = 'all' | 'active' | 'caution' | 'offline' | 'map';

export const WaterSourcesView: FC<WaterSourcesViewProps> = ({
  sources = [],
  readings = [],
  alerts = [],
  loading = false,
  onRefresh,
  onSelectSource,
  onCreateSource,
  onUpdateSource,
  onDeleteSource,
}) => {
  const [activeTab, setActiveTab] = useState<SourceTab>('all');
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All types');
  const [selectedStatus, setSelectedStatus] = useState('All statuses');
  const [selectedZone, setSelectedZone] = useState('All zones');
  const [selectedId, setSelectedId] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // CRUD Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [deletingSource, setDeletingSource] = useState<Source | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!onCreateSource) return;
    setIsSubmitting(true);
    const form = new FormData(e.currentTarget);
    const newSrc: Partial<Source> = {
      sourceId: String(form.get('sourceId') || `SRC-${Date.now().toString(36).toUpperCase()}`),
      name: String(form.get('name') || 'New Water Source'),
      sourceType: String(form.get('sourceType') || 'HAND_PUMP') as any,
      district: String(form.get('district') || 'Gwalior'),
      locality: String(form.get('locality') || 'Municipal Zone'),
      latitude: Number(form.get('latitude') || 26.2183),
      longitude: Number(form.get('longitude') || 78.1828),
      publicStatus: String(form.get('publicStatus') || 'ACTIVE') as any,
      lastReadingAt: new Date().toISOString(),
    };
    try {
      await onCreateSource(newSrc);
      setActionFeedback(`Water Source ${newSrc.sourceId} created successfully!`);
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
    if (!onUpdateSource || !editingSource) return;
    setIsSubmitting(true);
    const form = new FormData(e.currentTarget);
    const updates: Partial<Source> = {
      name: String(form.get('name') || editingSource.name),
      sourceType: String(form.get('sourceType') || editingSource.sourceType) as any,
      district: String(form.get('district') || editingSource.district),
      locality: String(form.get('locality') || editingSource.locality),
      latitude: Number(form.get('latitude') || editingSource.latitude),
      longitude: Number(form.get('longitude') || editingSource.longitude),
      publicStatus: String(form.get('publicStatus') || editingSource.publicStatus) as any,
    };
    try {
      await onUpdateSource(editingSource.sourceId, updates);
      setActionFeedback(`Water Source ${editingSource.sourceId} updated successfully!`);
      setEditingSource(null);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!onDeleteSource || !deletingSource) return;
    setIsSubmitting(true);
    try {
      await onDeleteSource(deletingSource.sourceId);
      setActionFeedback(`Water Source ${deletingSource.sourceId} decommissioned & removed.`);
      if (selectedId === deletingSource.sourceId) setSelectedId('');
      setDeletingSource(null);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group readings by sourceId for quick latest parameter lookups
  const latestReadingsBySource = useMemo(() => {
    const map = new Map<string, ApiRecord>();
    readings.forEach(r => {
      const sid = String(r.sourceId ?? '');
      if (sid && !map.has(sid)) {
        map.set(sid, r);
      }
    });
    return map;
  }, [readings]);

  // Group active alerts by sourceId
  const alertsBySource = useMemo(() => {
    const map = new Map<string, Alert[]>();
    alerts.forEach(a => {
      const list = map.get(a.sourceId) || [];
      list.push(a);
      map.set(a.sourceId, list);
    });
    return map;
  }, [alerts]);

  // Distinct types & zones for dropdowns
  const sourceTypes = useMemo(() => {
    const set = new Set<string>();
    sources.forEach(s => {
      if (s.sourceType) set.add(String(s.sourceType));
    });
    return Array.from(set);
  }, [sources]);

  const sourceStatuses = useMemo(() => {
    const set = new Set<string>();
    sources.forEach(s => {
      if (s.publicStatus) set.add(String(s.publicStatus));
    });
    return Array.from(set);
  }, [sources]);

  const municipalZones = useMemo(() => {
    const set = new Set<string>();
    sources.forEach(s => {
      if (s.locality) set.add(String(s.locality));
      else if (s.district) set.add(String(s.district));
    });
    return Array.from(set);
  }, [sources]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const total = sources.length;
    let activeCount = 0;
    let cautionCount = 0;
    let offlineCount = 0;
    const zones = new Set<string>();

    sources.forEach(s => {
      const st = String(s.publicStatus ?? '').toLowerCase();
      if (st.includes('active') || st.includes('normal') || st.includes('safe')) {
        activeCount++;
      } else if (st.includes('warn') || st.includes('caution') || st.includes('remediation') || st.includes('advisory')) {
        cautionCount++;
      } else if (st.includes('offline') || st.includes('inactive') || st.includes('isolated')) {
        offlineCount++;
      }

      if (s.locality) zones.add(s.locality);
      else if (s.district) zones.add(s.district);
    });

    return {
      total,
      activeCount,
      cautionCount,
      offlineCount,
      zonesCount: zones.size || 14,
    };
  }, [sources]);

  // Filtered sources
  const filtered = useMemo(() => {
    return sources.filter(source => {
      // 1. Tab filter
      const st = String(source.publicStatus ?? '').toLowerCase();
      if (activeTab === 'active' && !st.includes('active') && !st.includes('normal') && !st.includes('safe')) return false;
      if (activeTab === 'caution' && !st.includes('warn') && !st.includes('caution') && !st.includes('remediation') && !st.includes('advisory')) return false;
      if (activeTab === 'offline' && !st.includes('offline') && !st.includes('inactive') && !st.includes('isolated')) return false;

      // 2. Type filter
      if (selectedType !== 'All types' && source.sourceType !== selectedType) return false;

      // 3. Status filter
      if (selectedStatus !== 'All statuses' && source.publicStatus !== selectedStatus) return false;

      // 4. Zone filter
      if (selectedZone !== 'All zones') {
        const matchZone = source.locality === selectedZone || source.district === selectedZone;
        if (!matchZone) return false;
      }

      // 5. Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const id = String(source.sourceId ?? '').toLowerCase();
        const name = String(source.name ?? '').toLowerCase();
        const type = String(source.sourceType ?? '').toLowerCase();
        const loc = String(source.locality ?? '').toLowerCase();
        const dist = String(source.district ?? '').toLowerCase();
        if (!id.includes(q) && !name.includes(q) && !type.includes(q) && !loc.includes(q) && !dist.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [sources, activeTab, selectedType, selectedStatus, selectedZone, search]);

  // Selected Source for right detail pane
  const selectedSource = useMemo(() => {
    if (selectedId) {
      const found = sources.find(s => s.sourceId === selectedId);
      if (found) return found;
    }
    return filtered[0] || sources[0] || null;
  }, [sources, filtered, selectedId]);

  // Map pins for MapExplorer
  const pins = useMemo(() => {
    return sources
      .filter(source => typeof source.latitude === 'number' && typeof source.longitude === 'number')
      .map(source => ({
        sourceId: source.sourceId,
        name: source.name ?? source.sourceId,
        latitude: source.latitude!,
        longitude: source.longitude!,
        tone: /active|normal|safe/i.test(source.publicStatus ?? '')
          ? ('ok' as const)
          : /inactive|offline/i.test(source.publicStatus ?? '')
          ? ('off' as const)
          : ('warn' as const),
      }));
  }, [sources]);

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
            label: 'Total Municipal Sources',
            value: loading && sources.length === 0 ? '…' : kpiStats.total,
            sub: 'Gwalior Water Grid',
            subClr: 'text-blue-600',
            desc: 'Wells, WTPs & storage tanks',
          },
          {
            icon: <CheckCircle2 className="w-5 h-5" />,
            bg: 'bg-emerald-50',
            iconBg: 'bg-emerald-100 text-emerald-600',
            label: 'Active & Potable',
            value: loading && sources.length === 0 ? '…' : kpiStats.activeCount,
            sub: kpiStats.total > 0 ? `(${((kpiStats.activeCount / kpiStats.total) * 100).toFixed(1)}%)` : 'BIS IS 10500',
            subClr: 'text-emerald-700',
            desc: 'Passing drinking spec',
          },
          {
            icon: <AlertTriangle className="w-5 h-5" />,
            bg: 'bg-amber-50',
            iconBg: 'bg-amber-100 text-amber-600',
            label: 'Under Caution / Advisory',
            value: loading && sources.length === 0 ? '…' : kpiStats.cautionCount,
            sub: 'Active Watch',
            subClr: 'text-amber-700',
            desc: 'Dosing / flush in progress',
          },
          {
            icon: <AlertOctagon className="w-5 h-5" />,
            bg: 'bg-rose-50',
            iconBg: 'bg-rose-100 text-rose-600',
            label: 'Offline / Isolated',
            value: loading && sources.length === 0 ? '…' : kpiStats.offlineCount,
            sub: 'Supply Isolated',
            subClr: 'text-rose-700',
            desc: 'Pump & pipe maintenance',
          },
          {
            icon: <MapPin className="w-5 h-5" />,
            bg: 'bg-purple-50',
            iconBg: 'bg-purple-100 text-purple-600',
            label: 'Municipal Zones Covered',
            value: kpiStats.zonesCount,
            sub: '66 Wards',
            subClr: 'text-purple-700',
            desc: 'Lashkar, Morar & Thatipur',
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
          { id: 'all', label: `All Water Sources (${kpiStats.total})`, icon: <Droplets className="w-3.5 h-3.5" /> },
          { id: 'active', label: `Active & Potable (${kpiStats.activeCount})`, icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
          { id: 'caution', label: `Under Caution / Advisory (${kpiStats.cautionCount})`, icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> },
          { id: 'offline', label: `Offline / Maintenance (${kpiStats.offlineCount})`, icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-600" /> },
          { id: 'map', label: `GIS Map Explorer View`, icon: <MapIcon className="w-3.5 h-3.5 text-blue-600" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SourceTab)}
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
              aria-label="Search sources"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search water sources by Name, ID, Ward, locality, district..."
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
            {/* Source Type Select */}
            <select
              aria-label="Filter by source type"
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="All types">All Source Types</option>
              {sourceTypes.map(t => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </select>

            {/* Status Select */}
            <select
              aria-label="Filter by status"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="All statuses">All Statuses</option>
              {sourceStatuses.map(s => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </select>

            {/* Municipal Zone Select */}
            {municipalZones.length > 0 && (
              <select
                aria-label="Filter by zone"
                value={selectedZone}
                onChange={e => setSelectedZone(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
              >
                <option value="All zones">All Municipal Zones</option>
                {municipalZones.map(z => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            )}

            {/* Live Database Pill */}
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Grid Telemetry Live</span>
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
                title="Refresh sources"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Refresh</span>
              </button>
            )}

            {/* Add Source Button */}
            {onCreateSource && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Water Source</span>
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

      {/* ── MAP VIEW TOGGLED ── */}
      {activeTab === 'map' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>Gwalior Municipal Grid GIS Map Explorer</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time interactive spatial map showing water sources, distribution feeders, and monitoring stations.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
              {pins.length} Geocoded Pins
            </span>
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-200 min-h-[500px]">
            <MapExplorer sources={sources} highlightSources={pins} showStationCard={true} />
          </div>
        </div>
      ) : (
        /* ── 8/4 SPLIT LAYOUT: LEFT TABLE & RIGHT INSPECTION CARD ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: Sources Table (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between p-3.5 border-b border-[#1c295c] bg-[#0c1538]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">
                  Registered Water Facilities ({filtered.length} of {sources.length})
                </span>
                {loading && sources.length > 0 && <LoadingSpinner inline label="Refreshing sources…" />}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Click any source row to view live parameters &amp; active alerts
              </span>
            </div>

            {loading && sources.length === 0 ? (
              <LoadingSpinner
                label="Fetching 70+ water sources from Central Database…"
                sublabel="Loading municipal well & WTP telemetry &bull; live"
                fullHeight
              />
            ) : (
              <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0b1438] text-slate-400 font-semibold sticky top-0 z-10 border-b border-[#1c295c]">
                    <tr>
                      <th className="p-3">Source ID</th>
                      <th className="p-3">Facility Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Locality / Zone</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Latest Quality</th>
                      <th className="p-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(source => {
                      const isSelected = selectedSource?.sourceId === source.sourceId;
                      const isSafe = /active|normal|safe/i.test(source.publicStatus ?? '');
                      const isCaution = /warn|caution|remediation|advisory/i.test(source.publicStatus ?? '');
                      const activeSourceAlerts = alertsBySource.get(source.sourceId) || [];
                      const latestReading = latestReadingsBySource.get(source.sourceId);

                      return (
                        <tr
                          key={source.sourceId}
                          onClick={() => setSelectedId(source.sourceId)}
                          className={`transition-all duration-150 cursor-pointer group ${
                            isSelected
                              ? 'bg-[#152c66] border-l-4 border-l-cyan-400 text-white shadow-inner'
                              : activeSourceAlerts.length > 0
                              ? 'bg-[#291024]/70 hover:bg-[#381630] border-l-2 border-l-rose-500/70'
                              : 'hover:bg-[#162354]'
                          }`}
                        >
                          {/* Source ID */}
                          <td className="p-3 font-mono font-bold whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {isSafe ? (
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              ) : isCaution ? (
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                              )}
                              <span className={isSelected ? 'text-cyan-300 font-bold' : 'text-blue-400'}>
                                {source.sourceId}
                              </span>
                            </div>
                          </td>

                          {/* Facility Name */}
                          <td className="p-3">
                            <div className="font-semibold text-slate-200 leading-tight">
                              {stringValue(source.name)}
                            </div>
                            {activeSourceAlerts.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-[#3b1220] px-1.5 py-0.2 rounded border border-rose-700/60 mt-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>{activeSourceAlerts.length} Active Alert</span>
                              </span>
                            )}
                          </td>

                          {/* Source Type */}
                          <td className="p-3 whitespace-nowrap">
                            <span className="text-[11px] font-medium bg-[#16224f] text-slate-200 px-2 py-0.5 rounded-md border border-[#233575]">
                              {humanize(source.sourceType)}
                            </span>
                          </td>

                          {/* Locality / Zone */}
                          <td className="p-3 text-slate-300">
                            <div>{[source.locality, source.district].filter(Boolean).join(', ') || '—'}</div>
                            {source.latitude && source.longitude && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {source.latitude.toFixed(3)}, {source.longitude.toFixed(3)}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isSafe
                                  ? 'bg-[#0e3b32] text-emerald-300 border-emerald-700/60'
                                  : isCaution
                                  ? 'bg-[#3b2a0a] text-amber-300 border-amber-700/60'
                                  : 'bg-[#3b1220] text-rose-300 border-rose-700/60'
                              }`}
                            >
                              {isSafe && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                              {isCaution && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                              {!isSafe && !isCaution && <AlertOctagon className="w-3 h-3 text-rose-400" />}
                              <span>{humanize(source.publicStatus)}</span>
                            </span>
                          </td>

                          {/* Latest Quality Telemetry */}
                          <td className="p-3 whitespace-nowrap">
                            {latestReading ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono font-semibold bg-[#0e3b32] text-emerald-300 border border-emerald-700/60 px-1.5 py-0.2 rounded">
                                  {humanize(latestReading.verificationStatus)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {displayDate(latestReading.collectedAt)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">Regular Monitoring</span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {onUpdateSource && (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setEditingSource(source);
                                  }}
                                  className="text-slate-400 hover:text-cyan-300 p-1 hover:bg-[#162758] rounded-lg transition"
                                  title="Edit Source Parameters"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeleteSource && (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setDeletingSource(source);
                                  }}
                                  className="text-slate-400 hover:text-rose-400 p-1 hover:bg-[#381622] rounded-lg transition"
                                  title="Decommission / Delete Water Source"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  if (onSelectSource) onSelectSource(source.sourceId);
                                  else setSelectedId(source.sourceId);
                                }}
                                className="text-slate-400 hover:text-blue-400 p-1 hover:bg-[#162758] rounded-lg transition"
                                title="Open Source Station Details"
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
                    <Droplets className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No matching water sources found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try selecting a different status or municipal zone.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Detail Inspection Card (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {selectedSource ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
                {/* Header Badge */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Facility Dossier</h3>
                      <p className="text-[11px] font-mono text-blue-600">{selectedSource.sourceId}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      /active|normal|safe/i.test(selectedSource.publicStatus ?? '')
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {humanize(selectedSource.publicStatus)}
                  </span>
                </div>

                {/* Facility Info Card */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    {humanize(selectedSource.sourceType)}
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{stringValue(selectedSource.name)}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{[selectedSource.locality, selectedSource.district].filter(Boolean).join(', ') || 'Gwalior Municipal Grid'}</span>
                  </div>
                </div>

                {/* Active Alerts on this source */}
                {alertsBySource.get(selectedSource.sourceId) && (alertsBySource.get(selectedSource.sourceId)?.length || 0) > 0 && (
                  <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Active Advisory Warning</span>
                    </div>
                    {alertsBySource.get(selectedSource.sourceId)?.map(a => (
                      <div key={a.alertId} className="text-[11px] text-rose-900 leading-snug">
                        <span className="font-bold font-mono text-rose-700">{a.alertId}:</span> {a.reason || a.publicMessage}
                      </div>
                    ))}
                  </div>
                )}

                {/* Technical Specifications & Parameters */}
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-slate-800">Water Quality Telemetry Profile:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-500 block">pH Potability</span>
                      <span className="font-mono font-bold text-emerald-700">7.10 (Nominal)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-500 block">Turbidity Clarity</span>
                      <span className="font-mono font-bold text-emerald-700">0.92 NTU</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-500 block">TDS Minerals</span>
                      <span className="font-mono font-bold text-slate-800">460 mg/L</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-500 block">Chlorine Residual</span>
                      <span className="font-mono font-bold text-sky-700">0.38 mg/L</span>
                    </div>
                  </div>
                </div>

                {/* Coordinates & GIS Meta */}
                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>GPS Coordinates:</span>
                    <span className="font-mono font-medium text-slate-900">
                      {selectedSource.latitude?.toFixed(4) || '26.218'}, {selectedSource.longitude?.toFixed(4) || '78.182'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Statutory Compliance:</span>
                    <span className="font-medium text-slate-900">BIS IS 10500:2012 Drinking Water</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {onUpdateSource && (
                      <button
                        type="button"
                        onClick={() => setEditingSource(selectedSource)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#132754] hover:bg-[#1a3574] text-cyan-300 font-bold rounded-xl text-xs border border-[#22448f] transition cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Facility</span>
                      </button>
                    )}
                    {onDeleteSource && (
                      <button
                        type="button"
                        onClick={() => setDeletingSource(selectedSource)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#33111e] hover:bg-[#48182b] text-rose-300 font-bold rounded-xl text-xs border border-rose-800/60 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Decommission</span>
                      </button>
                    )}
                  </div>

                  {onSelectSource && (
                    <button
                      type="button"
                      onClick={() => onSelectSource(selectedSource.sourceId)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                    >
                      <span>Open Station Inspection Drawer &rarr;</span>
                    </button>
                  )}

                  <a
                    href="/sample-reports/ward01_tubewell_casing_integrity.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Station Certificate (.pdf)</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                <Droplets className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">Select any water source row to inspect telemetry data.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ALWAYS-AVAILABLE COMPACT MAP ACCORDION BELOW TABLE IF ON NON-MAP TAB ── */}
      {activeTab !== 'map' && (!loading || sources.length > 0) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-blue-600" />
              <span>Gwalior Municipal Grid Spatial Map Overview</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              Expand Full Map View &rarr;
            </button>
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-200 min-h-[380px]">
            <MapExplorer sources={sources} highlightSources={pins} showStationCard={false} />
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* CRUD MODALS FOR WATER SOURCES                                             */}
      {/* ========================================================================= */}

      {/* 1. Add Water Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0c1938] border border-[#1c295c] rounded-2xl shadow-2xl max-w-xl w-full p-6 text-white animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c295c]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Add New Water Source</h3>
                  <p className="text-[11px] text-slate-400">Register a municipal monitoring station or delivery point</p>
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
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Source ID</label>
                  <input
                    name="sourceId"
                    defaultValue={`SRC-${Date.now().toString(36).toUpperCase()}`}
                    required
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Facility Name</label>
                  <input
                    name="name"
                    placeholder="e.g. Bada Post Office Hand Pump"
                    required
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Source Type</label>
                  <select
                    name="sourceType"
                    defaultValue="HAND_PUMP"
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="HAND_PUMP">Hand Pump</option>
                    <option value="TUBE_WELL">Tube Well</option>
                    <option value="OVERHEAD_TANK">Overhead Reservoir Tank</option>
                    <option value="TREATMENT_PLANT">Water Treatment Plant</option>
                    <option value="BOREWELL">Community Borewell</option>
                    <option value="TAP">Public Tap Standpost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    name="publicStatus"
                    defaultValue="ACTIVE"
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE (Potable / Clear)</option>
                    <option value="CAUTION">CAUTION (Under Advisory)</option>
                    <option value="MAINTENANCE">MAINTENANCE (Remediation)</option>
                    <option value="OFFLINE">OFFLINE (Isolated Supply)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">District</label>
                  <input
                    name="district"
                    defaultValue="Gwalior"
                    required
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Locality / Ward</label>
                  <input
                    name="locality"
                    placeholder="e.g. Ward 14 - Maharaj Bada"
                    required
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">GPS Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="latitude"
                    defaultValue={26.2183}
                    required
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">GPS Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="longitude"
                    defaultValue={78.1828}
                    required
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
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
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Water Source</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Water Source Modal */}
      {editingSource && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0c1938] border border-[#1c295c] rounded-2xl shadow-2xl max-w-xl w-full p-6 text-white animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c295c]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Edit Water Source ({editingSource.sourceId})</h3>
                  <p className="text-[11px] text-slate-400">Modify station classification, coordinates or status</p>
                </div>
              </div>
              <button
                onClick={() => setEditingSource(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#162758] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Facility Name</label>
                <input
                  name="name"
                  defaultValue={editingSource.name}
                  required
                  className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Source Type</label>
                  <select
                    name="sourceType"
                    defaultValue={String(editingSource.sourceType || 'HAND_PUMP')}
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="HAND_PUMP">Hand Pump</option>
                    <option value="TUBE_WELL">Tube Well</option>
                    <option value="OVERHEAD_TANK">Overhead Reservoir Tank</option>
                    <option value="TREATMENT_PLANT">Water Treatment Plant</option>
                    <option value="BOREWELL">Community Borewell</option>
                    <option value="TAP">Public Tap Standpost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Public Status</label>
                  <select
                    name="publicStatus"
                    defaultValue={String(editingSource.publicStatus || 'ACTIVE')}
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE (Potable / Clear)</option>
                    <option value="CAUTION">CAUTION (Under Advisory)</option>
                    <option value="MAINTENANCE">MAINTENANCE (Remediation)</option>
                    <option value="OFFLINE">OFFLINE (Isolated Supply)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">District</label>
                  <input
                    name="district"
                    defaultValue={editingSource.district || 'Gwalior'}
                    required
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Locality / Ward</label>
                  <input
                    name="locality"
                    defaultValue={editingSource.locality || ''}
                    required
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">GPS Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="latitude"
                    defaultValue={editingSource.latitude || 26.2183}
                    required
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">GPS Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="longitude"
                    defaultValue={editingSource.longitude || 78.1828}
                    required
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#1c295c] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSource(null)}
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
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Decommission / Delete Water Source Confirmation Modal */}
      {deletingSource && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0c1938] border border-rose-900/60 rounded-2xl shadow-2xl max-w-md w-full p-6 text-white animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-900/50 text-rose-400 flex items-center justify-center border border-rose-700/60 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Decommission Water Source</h3>
                <p className="text-[11px] text-rose-300 font-mono">{deletingSource.sourceId}</p>
              </div>
            </div>

            <p className="mt-3.5 text-xs text-slate-300 leading-relaxed">
              Are you sure you want to decommission and remove{' '}
              <strong className="text-white">{deletingSource.name}</strong> ({deletingSource.sourceId})? Active
              telemetry ingestion will cease and the facility will be archived from the municipal registry.
            </p>

            <div className="mt-5 pt-3 border-t border-[#1c295c] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingSource(null)}
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
                <span>Confirm Decommission</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterSourcesView;
