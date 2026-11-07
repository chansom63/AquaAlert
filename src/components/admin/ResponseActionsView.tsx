import { useMemo, useState } from 'react';
import type { FC } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  Droplets,
  Edit,
  Eye,
  FileCheck,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type { Alert, Source } from '../../types/water';
import { displayDate, humanize, stringValue, type ApiRecord } from '../../api/adminRecords';
import { LoadingSpinner } from '../common/LoadingSpinner';

export interface ResponseActionsViewProps {
  actions: ApiRecord[];
  alerts?: Alert[];
  sources?: Source[];
  loading: boolean;
  onRecordAction?: () => void;
  onRefresh?: () => Promise<void>;
  onSelectAlert?: (alertId: string) => void;
  onUpdateAction?: (actionId: string, updates: ApiRecord) => Promise<void>;
  onDeleteAction?: (actionId: string) => Promise<void>;
}

type ActionCategoryTab = 'all' | 'dosing' | 'flushing' | 'inspection';

export const ResponseActionsView: FC<ResponseActionsViewProps> = ({
  actions = [],
  alerts = [],
  sources = [],
  loading = false,
  onRecordAction,
  onRefresh,
  onSelectAlert,
  onUpdateAction,
  onDeleteAction,
}) => {
  const [activeTab, setActiveTab] = useState<ActionCategoryTab>('all');
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All types');
  const [selectedRole, setSelectedRole] = useState('All roles');
  const [selectedAlertFilter, setSelectedAlertFilter] = useState('All alerts');
  const [selectedId, setSelectedId] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // CRUD states
  const [editingAction, setEditingAction] = useState<ApiRecord | null>(null);
  const [deletingAction, setDeletingAction] = useState<ApiRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!onUpdateAction || !editingAction) return;
    setIsSubmitting(true);
    const form = new FormData(e.currentTarget);
    const actionId = String(editingAction.actionId || editingAction.actionKey || '');
    const updates: ApiRecord = {
      actionType: String(form.get('actionType') || editingAction.actionType),
      summary: String(form.get('summary') || editingAction.summary),
      actorRole: String(form.get('actorRole') || editingAction.actorRole),
    };

    try {
      await onUpdateAction(actionId, updates);
      setActionFeedback(`Response action ${actionId} updated successfully!`);
      setEditingAction(null);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!onDeleteAction || !deletingAction) return;
    setIsSubmitting(true);
    const actionId = String(deletingAction.actionId || deletingAction.actionKey || '');
    try {
      await onDeleteAction(actionId);
      setActionFeedback(`Action log ${actionId} removed from audit ledger.`);
      if (selectedId === actionId) setSelectedId('');
      setDeletingAction(null);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Map of alerts and sources
  const alertMap = useMemo(() => {
    const map = new Map<string, Alert>();
    alerts.forEach(a => map.set(a.alertId, a));
    return map;
  }, [alerts]);

  const sourceMap = useMemo(() => {
    const map = new Map<string, Source>();
    sources.forEach(s => map.set(s.sourceId, s));
    return map;
  }, [sources]);

  // Action category classification helper
  const getActionCategory = (action: ApiRecord): 'dosing' | 'flushing' | 'inspection' | 'other' => {
    const type = String(action.actionType ?? '').toLowerCase();
    const summary = String(action.summary ?? '').toLowerCase();
    if (type.includes('dose') || type.includes('chlorin') || summary.includes('chlorin') || summary.includes('dosing')) {
      return 'dosing';
    }
    if (type.includes('flush') || type.includes('scour') || summary.includes('flush') || summary.includes('scour') || summary.includes('hydrant')) {
      return 'flushing';
    }
    if (type.includes('inspect') || type.includes('sample') || type.includes('audit') || summary.includes('inspection') || summary.includes('sample')) {
      return 'inspection';
    }
    return 'other';
  };

  // Distinct lists for dropdown filters
  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    actions.forEach(a => {
      if (a.actionType) set.add(String(a.actionType));
    });
    return Array.from(set);
  }, [actions]);

  const actorRoles = useMemo(() => {
    const set = new Set<string>();
    actions.forEach(a => {
      if (a.actorRole) set.add(String(a.actorRole));
    });
    return Array.from(set);
  }, [actions]);

  const linkedAlertIds = useMemo(() => {
    const set = new Set<string>();
    actions.forEach(a => {
      if (a.alertId) set.add(String(a.alertId));
    });
    return Array.from(set);
  }, [actions]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const total = actions.length;
    let dosingCount = 0;
    let flushingCount = 0;
    let inspectionCount = 0;
    const alertIds = new Set<string>();
    const roles = new Set<string>();

    actions.forEach(a => {
      const cat = getActionCategory(a);
      if (cat === 'dosing') dosingCount++;
      else if (cat === 'flushing') flushingCount++;
      else if (cat === 'inspection') inspectionCount++;

      if (a.alertId) alertIds.add(String(a.alertId));
      if (a.actorRole) roles.add(String(a.actorRole));
    });

    return {
      total,
      dosingCount,
      flushingCount,
      inspectionCount,
      alertsAddressed: alertIds.size,
      rolesCount: roles.size || 4,
    };
  }, [actions]);

  // Filtered Actions
  const filtered = useMemo(() => {
    return actions.filter(action => {
      // 1. Tab filter
      if (activeTab === 'dosing' && getActionCategory(action) !== 'dosing') return false;
      if (activeTab === 'flushing' && getActionCategory(action) !== 'flushing') return false;
      if (activeTab === 'inspection' && getActionCategory(action) !== 'inspection') return false;

      // 2. Type filter
      if (selectedType !== 'All types' && action.actionType !== selectedType) return false;

      // 3. Role filter
      if (selectedRole !== 'All roles' && action.actorRole !== selectedRole) return false;

      // 4. Alert filter
      if (selectedAlertFilter !== 'All alerts' && action.alertId !== selectedAlertFilter) return false;

      // 5. Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const id = String(action.actionId ?? action.actionKey ?? '').toLowerCase();
        const alertId = String(action.alertId ?? '').toLowerCase();
        const type = String(action.actionType ?? '').toLowerCase();
        const summary = String(action.summary ?? '').toLowerCase();
        const role = String(action.actorRole ?? '').toLowerCase();
        if (!id.includes(q) && !alertId.includes(q) && !type.includes(q) && !summary.includes(q) && !role.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [actions, activeTab, selectedType, selectedRole, selectedAlertFilter, search]);

  // Selected Action for right pane
  const selectedAction = useMemo(() => {
    if (selectedId) {
      const found = actions.find(a => (a.actionId ?? a.actionKey) === selectedId);
      if (found) return found;
    }
    return filtered[0] || actions[0] || null;
  }, [actions, filtered, selectedId]);

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
      {/* ── 5 THEMED KPI METRIC CARDS (Matching Evidence & Reports) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            icon: <ClipboardList className="w-5 h-5" />,
            bg: 'bg-blue-50',
            iconBg: 'bg-blue-100 text-blue-600',
            label: 'Total Response Actions',
            value: loading && actions.length === 0 ? '…' : kpiStats.total,
            sub: 'Audit Ledger',
            subClr: 'text-blue-600',
            desc: 'Logged remediation workflows',
          },
          {
            icon: <Droplets className="w-5 h-5" />,
            bg: 'bg-emerald-50',
            iconBg: 'bg-emerald-100 text-emerald-600',
            label: 'Chlorine & Dosing Boosts',
            value: loading && actions.length === 0 ? '…' : kpiStats.dosingCount,
            sub: 'Disinfection Active',
            subClr: 'text-emerald-700',
            desc: 'Chemical feed adjustments',
          },
          {
            icon: <RotateCcw className="w-5 h-5" />,
            bg: 'bg-sky-50',
            iconBg: 'bg-sky-100 text-sky-600',
            label: 'Pipeline Scour & Flushing',
            value: loading && actions.length === 0 ? '…' : kpiStats.flushingCount,
            sub: 'Hydraulic Cleaning',
            subClr: 'text-sky-700',
            desc: 'Distribution mains scour',
          },
          {
            icon: <AlertTriangle className="w-5 h-5" />,
            bg: 'bg-rose-50',
            iconBg: 'bg-rose-100 text-rose-600',
            label: 'Alerts Remediated',
            value: loading && actions.length === 0 ? '…' : kpiStats.alertsAddressed,
            sub: 'Advisories Covered',
            subClr: 'text-rose-700',
            desc: 'Incident-correlated response',
          },
          {
            icon: <Users className="w-5 h-5" />,
            bg: 'bg-purple-50',
            iconBg: 'bg-purple-100 text-purple-600',
            label: 'Engineering Roles Active',
            value: kpiStats.rolesCount,
            sub: 'Field & Lab Crews',
            subClr: 'text-purple-700',
            desc: 'Authorized operational actors',
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
          { id: 'all', label: `All Response Actions (${kpiStats.total})`, icon: <ClipboardList className="w-3.5 h-3.5" /> },
          { id: 'dosing', label: `Chemical Dosing & Treatment (${kpiStats.dosingCount})`, icon: <Droplets className="w-3.5 h-3.5 text-emerald-600" /> },
          { id: 'flushing', label: `Pipeline Flushing & Scour (${kpiStats.flushingCount})`, icon: <RotateCcw className="w-3.5 h-3.5 text-sky-600" /> },
          { id: 'inspection', label: `Field Inspection & Re-sampling (${kpiStats.inspectionCount})`, icon: <FileCheck className="w-3.5 h-3.5 text-purple-600" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActionCategoryTab)}
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
              aria-label="Search actions"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search actions by ID, Alert, type, engineering summary, actor role..."
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
            {/* Action Type Select */}
            <select
              aria-label="Filter by action type"
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="All types">All Action Types</option>
              {actionTypes.map(t => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </select>

            {/* Actor Role Select */}
            <select
              aria-label="Filter by actor role"
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="All roles">All Engineering Roles</option>
              {actorRoles.map(r => (
                <option key={r} value={r}>
                  {humanize(r)}
                </option>
              ))}
            </select>

            {/* Linked Alert Select */}
            {linkedAlertIds.length > 0 && (
              <select
                aria-label="Filter by alert"
                value={selectedAlertFilter}
                onChange={e => setSelectedAlertFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
              >
                <option value="All alerts">All Correlated Alerts</option>
                {linkedAlertIds.map(a => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            )}

            {/* Live Database Pill */}
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Audit Log Live</span>
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
                title="Refresh response actions log"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Refresh</span>
              </button>
            )}

            {/* Record Action CTA */}
            {onRecordAction && (
              <button
                type="button"
                onClick={onRecordAction}
                className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Action</span>
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
        {/* LEFT: Response Actions Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-3.5 border-b border-[#1c295c] bg-[#0c1538]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">
                Response Actions Log ({filtered.length} of {actions.length})
              </span>
              {loading && actions.length > 0 && <LoadingSpinner inline label="Refreshing response log…" />}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Click any response event to inspect engineering justification &amp; sign-off
            </span>
          </div>

          {loading && actions.length === 0 ? (
            <LoadingSpinner
              label="Fetching response actions audit log from Central Database…"
              sublabel="Querying incident resolution & remediation records &bull; live"
              fullHeight
            />
          ) : (
            <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b1438] text-slate-400 font-semibold sticky top-0 z-10 border-b border-[#1c295c]">
                  <tr>
                    <th className="p-3">Action ID</th>
                    <th className="p-3">Correlated Alert</th>
                    <th className="p-3">Action Category</th>
                    <th className="p-3">Operational Summary</th>
                    <th className="p-3">Authorized Role</th>
                    <th className="p-3">Executed At</th>
                    <th className="p-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(action => {
                    const actionIdStr = stringValue(action.actionId ?? action.actionKey);
                    const isSelected = selectedAction && (selectedAction.actionId ?? selectedAction.actionKey) === actionIdStr;
                    const cat = getActionCategory(action);
                    const linkedAlert = action.alertId ? alertMap.get(String(action.alertId)) : null;

                    return (
                      <tr
                        key={actionIdStr}
                        onClick={() => setSelectedId(actionIdStr)}
                        className={`transition-all duration-150 cursor-pointer group ${
                          isSelected
                            ? 'bg-[#152c66] border-l-4 border-l-cyan-400 text-white shadow-inner'
                            : 'hover:bg-[#162354]'
                        }`}
                      >
                        {/* Action ID */}
                        <td className="p-3 font-mono font-bold whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className={isSelected ? 'text-cyan-300 font-bold' : 'text-blue-400'}>
                              {actionIdStr}
                            </span>
                          </div>
                        </td>

                        {/* Correlated Alert ID */}
                        <td className="p-3 whitespace-nowrap">
                          {action.alertId ? (
                            <span
                              onClick={e => {
                                if (onSelectAlert && action.alertId) {
                                  e.stopPropagation();
                                  onSelectAlert(String(action.alertId));
                                }
                              }}
                              className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                linkedAlert && /critical|high/i.test(linkedAlert.severity ?? '')
                                  ? 'bg-[#3b1220] text-rose-300 border-rose-700/60 hover:bg-[#4a1829]'
                                  : 'bg-[#0c2e56] text-sky-300 border-sky-700/60 hover:bg-[#133d70]'
                              }`}
                            >
                              {stringValue(action.alertId)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">System Routine</span>
                          )}
                        </td>

                        {/* Action Type Badge */}
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              cat === 'dosing'
                                ? 'bg-[#0e3b32] text-emerald-300 border-emerald-700/60'
                                : cat === 'flushing'
                                ? 'bg-[#0c2e56] text-sky-300 border-sky-700/60'
                                : cat === 'inspection'
                                ? 'bg-[#2a1d5c] text-purple-300 border-purple-700/60'
                                : 'bg-[#3b2a0a] text-amber-300 border-amber-700/60'
                            }`}
                          >
                            {humanize(action.actionType)}
                          </span>
                        </td>

                        {/* Operational Summary */}
                        <td className="p-3 text-slate-200 max-w-xs">
                          <p className="line-clamp-2 text-xs leading-snug">{stringValue(action.summary)}</p>
                        </td>

                        {/* Authorized Role */}
                        <td className="p-3 whitespace-nowrap">
                          <span className="text-[11px] font-medium bg-[#16224f] text-slate-200 px-2 py-0.5 rounded-md border border-[#233575]">
                            {humanize(action.actorRole)}
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="p-3 text-slate-400 whitespace-nowrap text-[11px]">
                          {displayDate(action.createdAt)}
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {onUpdateAction && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setEditingAction(action);
                                }}
                                className="text-slate-400 hover:text-cyan-300 p-1 hover:bg-[#162758] rounded-lg transition"
                                title="Edit Response Action"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteAction && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setDeletingAction(action);
                                }}
                                className="text-slate-400 hover:text-rose-400 p-1 hover:bg-[#381622] rounded-lg transition"
                                title="Delete Action Log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedId(actionIdStr);
                              }}
                              className="text-slate-400 hover:text-blue-400 p-1 hover:bg-[#162758] rounded-lg transition"
                              title="Inspect Action Dossier"
                            >
                              <Eye className="w-4 h-4" />
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
                  <ClipboardList className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No matching response actions logged</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try selecting a different filter or clearing search.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Detail Inspection Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {selectedAction ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Action Dossier</h3>
                    <p className="text-[11px] font-mono text-blue-600">
                      {stringValue(selectedAction.actionId ?? selectedAction.actionKey)}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  {humanize(selectedAction.actionType)}
                </span>
              </div>

              {/* Engineering Justification */}
              <div className="p-3.5 bg-[#091533] rounded-xl border border-[#1e3470] space-y-1.5">
                <div className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wide">
                  Engineering Justification &amp; Notes
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-normal">
                  {stringValue(selectedAction.summary)}
                </p>
              </div>

              {/* Correlated Alert Card */}
              {Boolean(selectedAction.alertId) && (
                <div className="p-3.5 bg-[#091533] rounded-xl border border-[#1e3470] space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white tracking-wide">Correlated Incident Alert</span>
                    <span className="text-[10px] font-mono font-bold text-cyan-300 bg-[#122452] px-2.5 py-0.5 rounded-md border border-cyan-500/40">
                      {stringValue(selectedAction.alertId)}
                    </span>
                  </div>

                  {Boolean(alertMap.get(String(selectedAction.alertId))) && (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-slate-300">
                        <span>Incident Severity:</span>
                        <span className="font-bold text-rose-400 bg-rose-950/70 px-2 py-0.5 rounded border border-rose-800/60 font-mono">
                          {humanize(alertMap.get(String(selectedAction.alertId))?.severity)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span>Target Water Source:</span>
                        <span className="font-semibold text-white">
                          {sourceMap.get(String(alertMap.get(String(selectedAction.alertId))?.sourceId ?? ''))?.name ||
                            stringValue(alertMap.get(String(selectedAction.alertId))?.sourceId)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 pt-1 leading-relaxed bg-[#060e24] p-2.5 rounded-lg border border-[#162758]">
                        {stringValue(
                          alertMap.get(String(selectedAction.alertId))?.publicMessage,
                          stringValue(alertMap.get(String(selectedAction.alertId))?.reason),
                        )}
                      </div>
                    </div>
                  )}

                  {Boolean(onSelectAlert && selectedAction.alertId) && (
                    <button
                      type="button"
                      onClick={() => onSelectAlert?.(String(selectedAction.alertId))}
                      className="w-full text-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl border border-blue-400/40 shadow-md shadow-blue-500/30 transition mt-1.5 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Open Full Incident Drawer</span>
                      <span>&rarr;</span>
                    </button>
                  )}
                </div>
              )}

              {/* Personnel & Sign-off Metadata */}
              <div className="border-t border-[#1c295c] pt-3 space-y-2 text-xs">
                <div className="text-[11px] font-semibold text-slate-400">Authorized Signatory &amp; Ledger Audit</div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#091533] border border-[#1e3470]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 flex items-center justify-center font-bold text-xs">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">{humanize(selectedAction.actorRole)}</div>
                      <div className="text-[10px] text-slate-400">Gwalior Municipal Water Surveillance Unit</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 px-2 py-0.5 rounded">
                    AUTHORIZED
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Execution Timestamp:</span>
                  <span className="font-medium text-slate-200">{displayDate(selectedAction.createdAt)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Compliance Framework:</span>
                  <span className="font-medium text-slate-200">BIS IS 10500:2012 Drinking Water</span>
                </div>
              </div>

              {/* Actions & Audit Certificate */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {onUpdateAction && (
                    <button
                      type="button"
                      onClick={() => setEditingAction(selectedAction)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#132754] hover:bg-[#1a3574] text-cyan-300 font-bold rounded-xl text-xs border border-[#22448f] transition cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Action</span>
                    </button>
                  )}
                  {onDeleteAction && (
                    <button
                      type="button"
                      onClick={() => setDeletingAction(selectedAction)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#33111e] hover:bg-[#48182b] text-rose-300 font-bold rounded-xl text-xs border border-rose-800/60 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                <a
                  href="/sample-reports/ward28_chlorine_depletion_investigation.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Response Action Certificate (.pdf)</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              <ClipboardList className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs">Select any response action row to view details.</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CRUD MODALS FOR RESPONSE ACTIONS                                          */}
      {/* ========================================================================= */}

      {/* 1. Edit Response Action Modal */}
      {editingAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0c1938] border border-[#1c295c] rounded-2xl shadow-2xl max-w-xl w-full p-6 text-white animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c295c]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">
                    Edit Response Action ({String(editingAction.actionId || editingAction.actionKey)})
                  </h3>
                  <p className="text-[11px] text-slate-400">Update operational intervention details or category</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#162758] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Action Category</label>
                  <select
                    name="actionType"
                    defaultValue={String(editingAction.actionType || 'FIELD_INVESTIGATION')}
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="CHLORINE_DOSING">Chlorine Dosing / Disinfection</option>
                    <option value="SCOUR_FLUSH">Main Line Scour Flushing</option>
                    <option value="FIELD_INVESTIGATION">Field On-site Investigation</option>
                    <option value="PIPE_REPAIR">Pipeline Repair &amp; Rehabilitation</option>
                    <option value="BOIL_WATER_NOTICE">Public Boil Water Notice</option>
                    <option value="ISOLATION_VALVE">Feeder Isolation Valve Closure</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Authorized Role</label>
                  <select
                    name="actorRole"
                    defaultValue={String(editingAction.actorRole || 'MUNICIPAL_OFFICER')}
                    className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="MUNICIPAL_OFFICER">Municipal Health Officer</option>
                    <option value="CHIEF_CHEMIST">Chief Quality Chemist</option>
                    <option value="FIELD_ENGINEER">Distribution Field Engineer</option>
                    <option value="ZONE_SUPERINTENDENT">Zone Water Superintendent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Engineering Summary / Justification</label>
                <textarea
                  name="summary"
                  defaultValue={String(editingAction.summary || '')}
                  rows={3}
                  required
                  className="w-full px-3 py-1.5 bg-[#080e26] border border-[#1e3470] rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#1c295c] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAction(null)}
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

      {/* 2. Delete Response Action Confirmation Modal */}
      {deletingAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0c1938] border border-rose-900/60 rounded-2xl shadow-2xl max-w-md w-full p-6 text-white animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-900/50 text-rose-400 flex items-center justify-center border border-rose-700/60 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Delete Response Action Log</h3>
                <p className="text-[11px] text-rose-300 font-mono">
                  {String(deletingAction.actionId || deletingAction.actionKey)}
                </p>
              </div>
            </div>

            <p className="mt-3.5 text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove this intervention record from the audit ledger? This log records an
              action taken by{' '}
              <strong className="text-white">{humanize(deletingAction.actorRole)}</strong> for alert{' '}
              <span className="font-mono text-cyan-300">{String(deletingAction.alertId)}</span>.
            </p>

            <div className="mt-5 pt-3 border-t border-[#1c295c] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingAction(null)}
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
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseActionsView;
