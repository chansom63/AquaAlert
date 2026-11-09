import { useState, useMemo } from 'react';
import type { FC } from 'react';
import type { ComplaintRecord, ComplaintStatus, ComplaintPriority } from '../../types/water';
import { GWALIOR_WARDS_66 } from '../../data/gwaliorWardsData.js';
import {
  Camera,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  MapPin,
  MessageSquareWarning,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
  XCircle,
  Check,
} from 'lucide-react';

export interface ComplaintsViewProps {
  complaints: ComplaintRecord[];
  loading?: boolean;
  onRefresh?: () => Promise<void>;
  onUpdateComplaint?: (complaintId: string, updates: Partial<ComplaintRecord>) => Promise<void>;
  onDeleteComplaint?: (complaintId: string) => Promise<void>;
  onCreateComplaint?: (complaint: Partial<ComplaintRecord>) => Promise<ComplaintRecord>;
}

export const ComplaintsView: FC<ComplaintsViewProps> = ({
  complaints = [],
  loading = false,
  onRefresh,
  onUpdateComplaint,
  onDeleteComplaint,
  onCreateComplaint,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [wardFilter, setWardFilter] = useState<string>('ALL');

  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRecord | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Edit / Resolve form state
  const [editStatus, setEditStatus] = useState<ComplaintStatus>('PENDING');
  const [editPriority, setEditPriority] = useState<ComplaintPriority>('HIGH');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editResolutionNotes, setEditResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // KPI Calculations
  const kpiMetrics = useMemo(() => {
    const total = complaints.length;
    const pending = complaints.filter(c => c.status === 'PENDING' || !c.status).length;
    const inProgress = complaints.filter(c => c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED' || c.status === 'TRIAGED').length;
    const resolved = complaints.filter(c => c.status === 'RESOLVED').length;
    const critical = complaints.filter(c => c.priority === 'CRITICAL').length;
    const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0';

    return { total, pending, inProgress, resolved, critical, resolutionRate };
  }, [complaints]);

  // Filtered complaints
  const filtered = useMemo(() => {
    return complaints.filter(c => {
      if (statusFilter !== 'ALL' && (c.status || 'PENDING') !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && (c.priority || 'MEDIUM') !== priorityFilter) return false;
      if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
      if (wardFilter !== 'ALL' && String(c.wardNumber) !== wardFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesRef = (c.reference || c.complaintId || '').toLowerCase().includes(q);
        const matchesDetails = (c.details || '').toLowerCase().includes(q);
        const matchesCitizen = (c.citizenName || '').toLowerCase().includes(q);
        const matchesPhone = (c.citizenPhone || '').toLowerCase().includes(q);
        const matchesWard = `ward ${c.wardNumber}`.includes(q);
        const matchesCategory = (c.category || '').toLowerCase().includes(q);
        return matchesRef || matchesDetails || matchesCitizen || matchesPhone || matchesWard || matchesCategory;
      }

      return true;
    });
  }, [complaints, statusFilter, priorityFilter, categoryFilter, wardFilter, search]);

  const handleOpenDossier = (comp: ComplaintRecord) => {
    setSelectedComplaint(comp);
    setEditStatus(comp.status || 'PENDING');
    setEditPriority(comp.priority || 'MEDIUM');
    setEditAssignedTo(comp.assignedTo || '');
    setEditResolutionNotes(comp.resolutionNotes || '');
    setIsDossierOpen(true);
  };

  const handleSaveDossier = async () => {
    if (!selectedComplaint) return;
    setIsSubmitting(true);
    try {
      const updates: Partial<ComplaintRecord> = {
        status: editStatus,
        priority: editPriority,
        assignedTo: editAssignedTo.trim() || 'Unassigned',
        resolutionNotes: editResolutionNotes.trim(),
        resolvedAt: editStatus === 'RESOLVED' ? (selectedComplaint.resolvedAt || new Date().toISOString()) : undefined,
      };

      if (onUpdateComplaint) {
        await onUpdateComplaint(selectedComplaint.complaintId, updates);
      }

      setSelectedComplaint(prev => prev ? { ...prev, ...updates } : null);
      showToast(`Complaint ${selectedComplaint.reference || selectedComplaint.complaintId} updated successfully.`);
      setIsDossierOpen(false);
    } catch (err) {
      console.error('Update complaint error:', err);
      showToast('Error updating complaint record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (comp: ComplaintRecord) => {
    if (!confirm(`Are you sure you want to dismiss complaint ${comp.reference || comp.complaintId}?`)) {
      return;
    }
    try {
      if (onDeleteComplaint) {
        await onDeleteComplaint(comp.complaintId);
      }
      showToast(`Complaint ${comp.reference || comp.complaintId} dismissed.`);
      if (selectedComplaint?.complaintId === comp.complaintId) {
        setIsDossierOpen(false);
      }
    } catch (err) {
      console.error('Delete complaint error:', err);
      showToast('Error deleting complaint record.');
    }
  };

  const handleExportCsv = () => {
    const headers = ['ComplaintID', 'Ward', 'Category', 'Details', 'CitizenName', 'Phone', 'Status', 'Priority', 'AssignedTo', 'CreatedAt', 'ResolvedAt', 'S3Bucket', 'S3Key'];
    const rows = filtered.map(c => [
      c.complaintId || c.reference,
      c.wardNumber,
      `"${(c.category || '').replace(/"/g, '""')}"`,
      `"${(c.details || '').replace(/"/g, '""')}"`,
      `"${(c.citizenName || '').replace(/"/g, '""')}"`,
      c.citizenPhone || '',
      c.status || 'PENDING',
      c.priority || 'MEDIUM',
      `"${(c.assignedTo || '').replace(/"/g, '""')}"`,
      c.createdAt || '',
      c.resolvedAt || '',
      c.s3Bucket || '',
      c.s3Key || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GMC_Citizen_Complaints_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600/50">
            <CheckCircle2 className="w-3 h-3" />
            <span>RESOLVED</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/50">
            <Clock className="w-3 h-3 animate-spin" />
            <span>IN PROGRESS</span>
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/50">
            <Users className="w-3 h-3" />
            <span>ASSIGNED</span>
          </span>
        );
      case 'TRIAGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-500/50">
            <span>TRIAGED</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/50">
            <XCircle className="w-3 h-3" />
            <span>REJECTED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600/50">
            <Clock className="w-3 h-3" />
            <span>PENDING</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">⚡ CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">▲ HIGH</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 font-mono">▽ LOW</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono">● MEDIUM</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. Top Title & Quick Actions Banner ── */}
      <div className="p-5 rounded-2xl bg-[#091533] border border-[#1e3470] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <MessageSquareWarning className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Citizen Complaints &amp; Grievance Registry
              </h2>
              <p className="text-xs text-slate-400">
                Centralized municipal grievance ledger in DynamoDB table <code className="text-sky-300 font-mono">Complaints</code> with photographic evidence stored in S3 bucket <code className="text-cyan-300 font-mono">waterq-dev-complaints-evidence</code>.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#12234e] hover:bg-[#1a316b] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer border border-[#1e3470]"
              title="Refresh complaints from central database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#12234e] hover:bg-[#1a316b] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer border border-[#1e3470]"
            title="Export filtered complaints to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {onCreateComplaint && (
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-amber-600/20 cursor-pointer border-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Citizen Grievance</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. KPI Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-[#091533] border border-[#1e3470] space-y-1">
          <div className="text-[11px] font-semibold text-slate-400">Total Logged</div>
          <div className="text-2xl font-black text-white">{kpiMetrics.total}</div>
          <div className="text-[10px] text-slate-500">All 66 wards</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#091533] border border-[#1e3470] space-y-1">
          <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Pending Review</span>
          </div>
          <div className="text-2xl font-black text-amber-400">{kpiMetrics.pending}</div>
          <div className="text-[10px] text-slate-500">Awaiting engineer triage</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#091533] border border-[#1e3470] space-y-1">
          <div className="text-[11px] font-semibold text-cyan-300">Under Inspection</div>
          <div className="text-2xl font-black text-cyan-400">{kpiMetrics.inProgress}</div>
          <div className="text-[10px] text-slate-500">Field crew on-site</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#091533] border border-[#1e3470] space-y-1">
          <div className="text-[11px] font-semibold text-emerald-300">Resolved &amp; Closed</div>
          <div className="text-2xl font-black text-emerald-400">{kpiMetrics.resolved}</div>
          <div className="text-[10px] text-slate-500">{kpiMetrics.resolutionRate}% resolution rate</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#091533] border border-[#1e3470] space-y-1">
          <div className="text-[11px] font-semibold text-rose-300">Critical Outages</div>
          <div className="text-2xl font-black text-rose-400">{kpiMetrics.critical}</div>
          <div className="text-[10px] text-slate-500">Bursts / Contamination</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#091533] border border-[#1e3470] space-y-1">
          <div className="text-[11px] font-semibold text-purple-300">S3 Evidence Files</div>
          <div className="text-2xl font-black text-purple-400">
            {complaints.filter(c => c.s3Key || c.photoName).length}
          </div>
          <div className="text-[10px] text-slate-500">Attached photos &amp; telemetry</div>
        </div>
      </div>

      {/* ── 3. Filters & Search Controls ── */}
      <div className="p-4 rounded-xl bg-[#091533] border border-[#1e3470] space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by reference (AA-CMP-...), citizen name, phone, ward, details..."
              className="w-full pl-9 pr-4 py-2 bg-[#0d1c44] border border-[#1e3470] rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Quick Filter Selects */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#0d1c44] border border-[#1e3470] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Priority */}
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-[#0d1c44] border border-[#1e3470] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Category */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-[#0d1c44] border border-[#1e3470] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="Water quality concern">Water quality concern</option>
              <option value="Turbid / Muddy water">Turbid / Muddy water</option>
              <option value="Chemical odor / Chlorine depletion">Chemical odor / Chlorine</option>
              <option value="Pipeline burst / Leakage">Pipeline burst / Leakage</option>
              <option value="Sewage cross-contamination concern">Sewage cross-contamination</option>
              <option value="Low pressure / No supply">Low pressure / No supply</option>
              <option value="Saline / High TDS taste">Saline / High TDS</option>
            </select>

            {/* Ward */}
            <select
              value={wardFilter}
              onChange={e => setWardFilter(e.target.value)}
              className="px-3 py-2 bg-[#0d1c44] border border-[#1e3470] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
            >
              <option value="ALL">All 66 Wards</option>
              {GWALIOR_WARDS_66.map(w => (
                <option key={w.wardNumber} value={String(w.wardNumber)}>
                  Ward {String(w.wardNumber).padStart(2, '0')} - {w.name.split(' - ')[1]}
                </option>
              ))}
            </select>

            {(statusFilter !== 'ALL' || priorityFilter !== 'ALL' || categoryFilter !== 'ALL' || wardFilter !== 'ALL' || search) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setPriorityFilter('ALL');
                  setCategoryFilter('ALL');
                  setWardFilter('ALL');
                  setSearch('');
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Complaints Data Table ── */}
      <div className="rounded-2xl bg-[#091533] border border-[#1e3470] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0c1c44] text-[11px] font-mono text-slate-400 uppercase tracking-wider border-b border-[#1e3470]">
              <tr>
                <th className="py-3.5 px-4">Complaint ID</th>
                <th className="py-3.5 px-4">Ward / Station</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Citizen Details</th>
                <th className="py-3.5 px-4">Evidence</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Assigned To</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3470]/60">
              {filtered.map(comp => (
                <tr
                  key={comp.complaintId || comp.reference}
                  className="hover:bg-[#102456]/60 transition"
                >
                  {/* ID */}
                  <td className="py-3 px-4 font-mono font-bold text-cyan-300 whitespace-nowrap">
                    {comp.reference || comp.complaintId}
                  </td>

                  {/* Ward */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-200">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>Ward {String(comp.wardNumber).padStart(2, '0')}</span>
                    </span>
                    <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                      {comp.sourceName || `gmc-ward-${comp.wardNumber}`}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 whitespace-nowrap font-medium text-white">
                    {comp.category}
                  </td>

                  {/* Citizen details & snippet */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-200">{comp.citizenName || 'Citizen Reporter'}</div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 max-w-[280px]">
                      {comp.details}
                    </p>
                    {comp.citizenPhone && (
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-2.5 h-2.5" />
                        <span>{comp.citizenPhone}</span>
                      </span>
                    )}
                  </td>

                  {/* S3 Evidence */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {comp.s3Key || comp.photoName ? (
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 rounded bg-purple-950/60 border border-purple-800/40 text-purple-300">
                          <Camera className="w-3.5 h-3.5" />
                        </span>
                        <div className="text-[10px] text-slate-400">
                          <span className="text-purple-300 font-mono truncate max-w-[100px] block">
                            {comp.photoName || 'photo.jpg'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">No image</span>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getPriorityBadge(comp.priority)}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getStatusBadge(comp.status)}
                  </td>

                  {/* Assigned To */}
                  <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-300">
                    {comp.assignedTo && comp.assignedTo !== 'Unassigned' ? (
                      <span className="text-indigo-300 font-medium">{comp.assignedTo}</span>
                    ) : (
                      <span className="text-slate-500 italic">Unassigned</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenDossier(comp)}
                        className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 hover:text-white transition cursor-pointer border border-blue-500/30"
                        title="Inspect full dossier and update resolution status"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(comp)}
                        className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 hover:text-white transition cursor-pointer border border-rose-500/30"
                        title="Dismiss complaint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No citizen complaints found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Dossier & Resolution Modal ── */}
      {isDossierOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#091533] border border-[#1e3470] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1e3470] pb-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                    {selectedComplaint.reference || selectedComplaint.complaintId}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Ward {String(selectedComplaint.wardNumber).padStart(2, '0')}
                  </span>
                  {getPriorityBadge(selectedComplaint.priority)}
                </div>
                <h3 className="text-base font-bold text-white pt-1">
                  {selectedComplaint.category}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDossierOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Citizen Description Card */}
            <div className="p-4 rounded-xl bg-[#0c1c44] border border-[#1e3470] space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Citizen Grievance Description
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {selectedComplaint.details}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1e3470]/60 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Reporter:</span>{' '}
                  <strong className="text-slate-200">{selectedComplaint.citizenName || 'Citizen Reporter'}</strong>
                </div>
                {selectedComplaint.citizenPhone && (
                  <div>
                    <span className="text-slate-400 text-[11px]">Phone:</span>{' '}
                    <strong className="text-slate-200 font-mono">{selectedComplaint.citizenPhone}</strong>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 text-[11px]">Logged At:</span>{' '}
                  <span className="text-slate-300 font-mono">{new Date(selectedComplaint.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Target Main:</span>{' '}
                  <span className="text-slate-300">{selectedComplaint.sourceName || `Ward ${selectedComplaint.wardNumber}`}</span>
                </div>
              </div>
            </div>

            {/* Attached S3 Evidence Preview */}
            {(selectedComplaint.s3Key || selectedComplaint.photoName || selectedComplaint.photoUrl) && (
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-purple-400" />
                    <span>Evidence Attached in Dedicated Complaints Bucket</span>
                  </span>
                  <span className="font-mono text-[10px] text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/40">
                    waterq-dev-complaints-evidence
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono break-all">
                  Object Key: <span className="text-cyan-300">{selectedComplaint.s3Key || `complaints/evidence/${selectedComplaint.complaintId}.jpg`}</span>
                </div>
                {selectedComplaint.photoUrl && (
                  <div className="pt-2">
                    <img
                      src={selectedComplaint.photoUrl}
                      alt="Citizen complaint evidence"
                      className="max-h-48 rounded-lg border border-[#1e3470] object-cover"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Resolution & Assignment Controls */}
            <div className="space-y-3 pt-1">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Municipal Action &amp; Status Update
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Investigation Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as ComplaintStatus)}
                    className="w-full px-3 py-2 bg-[#0c1c44] border border-[#1e3470] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition cursor-pointer"
                  >
                    <option value="PENDING">Pending Review</option>
                    <option value="TRIAGED">Triaged by Desk</option>
                    <option value="ASSIGNED">Assigned to Engineer</option>
                    <option value="IN_PROGRESS">Active Field Inspection</option>
                    <option value="RESOLVED">Resolved &amp; Safe</option>
                    <option value="REJECTED">Dismissed / Inapplicable</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Priority Override</label>
                  <select
                    value={editPriority}
                    onChange={e => setEditPriority(e.target.value as ComplaintPriority)}
                    className="w-full px-3 py-2 bg-[#0c1c44] border border-[#1e3470] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition cursor-pointer"
                  >
                    <option value="CRITICAL">⚡ Critical</option>
                    <option value="HIGH">▲ High</option>
                    <option value="MEDIUM">● Medium</option>
                    <option value="LOW">▽ Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Assigned Surveillance Engineer / Field Squad</label>
                <input
                  type="text"
                  value={editAssignedTo}
                  onChange={e => setEditAssignedTo(e.target.value)}
                  placeholder="e.g. Er. R. K. Sharma (Lashkar Central) or Pipeline Squad #2"
                  className="w-full px-3 py-2 bg-[#0c1c44] border border-[#1e3470] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Resolution Findings / Corrective Action Notes</label>
                <textarea
                  value={editResolutionNotes}
                  onChange={e => setEditResolutionNotes(e.target.value)}
                  rows={3}
                  placeholder="Record corrective actions taken (e.g. valve replaced, line flushed, chemical dosing adjusted, water quality re-verified under IS 10500)..."
                  className="w-full px-3 py-2 bg-[#0c1c44] border border-[#1e3470] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1e3470]">
              <button
                type="button"
                onClick={() => setIsDossierOpen(false)}
                className="px-4 py-2 bg-[#12234e] hover:bg-[#1a316b] text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer border border-[#1e3470]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDossier}
                disabled={isSubmitting}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/25 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Updates…</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Updates to Complaints Table</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Log New Citizen Grievance Modal ── */}
      {isNewModalOpen && onCreateComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#091533] border border-[#1e3470] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1e3470] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Log Citizen Grievance (Staff Intake)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const wardNum = Number(form.get('wardNumber') || 14);
                const category = String(form.get('category'));
                const details = String(form.get('details'));
                const citizenName = String(form.get('citizenName') || 'Citizen Caller');
                const citizenPhone = String(form.get('citizenPhone') || '');

                const newRecord: Partial<ComplaintRecord> = {
                  wardNumber: wardNum,
                  category,
                  details,
                  citizenName,
                  citizenPhone,
                  sourceId: `gmc-ward-${String(wardNum).padStart(2, '0')}`,
                  sourceName: `Ward ${String(wardNum).padStart(2, '0')} Municipal Feeder`,
                  status: 'ASSIGNED',
                  priority: category.includes('burst') || category.includes('sewage') ? 'CRITICAL' : 'HIGH',
                  s3Bucket: 'waterq-dev-complaints-evidence',
                };

                await onCreateComplaint(newRecord);
                showToast('New citizen grievance recorded in Complaints table.');
                setIsNewModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-slate-400 block mb-1">Administrative Ward</label>
                <select name="wardNumber" required defaultValue="14" className="w-full px-3 py-2 bg-[#0c1c44] border border-[#1e3470] rounded-xl text-white">
                  {GWALIOR_WARDS_66.map(w => (
                    <option key={w.wardNumber} value={w.wardNumber}>
                      Ward {String(w.wardNumber).padStart(2, '0')} - {w.name.split(' - ')[1]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Issue Category</label>
                <select name="category" required defaultValue="Turbid / Muddy water" className="w-full px-3 py-2 bg-[#0c1c44] border border-[#1e3470] rounded-xl text-white">
                  <option>Water quality concern</option>
                  <option>Turbid / Muddy water</option>
                  <option>Chemical odor / Chlorine depletion</option>
                  <option>Pipeline burst / Leakage</option>
                  <option>Sewage cross-contamination concern</option>
                  <option>No water supply</option>
                  <option>Low water pressure</option>
                  <option>Saline / High TDS taste</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Citizen Full Name</label>
                <input name="citizenName" placeholder="e.g. Ramesh Chandra Sharma" className="w-full px-3 py-2 bg-[#0c1c44] border border-[#1e3470] rounded-xl text-white" />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Mobile Contact</label>
                <input name="citizenPhone" placeholder="e.g. +91 98261 45890" className="w-full px-3 py-2 bg-[#0c1c44] border border-[#1e3470] rounded-xl text-white" />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Complaint Details</label>
                <textarea name="details" required rows={3} placeholder="Describe location, observations, and initial instructions..." className="w-full px-3 py-2 bg-[#0c1c44] border border-[#1e3470] rounded-xl text-white" />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1e3470]">
                <button type="button" onClick={() => setIsNewModalOpen(false)} className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl">Record Grievance</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsView;
