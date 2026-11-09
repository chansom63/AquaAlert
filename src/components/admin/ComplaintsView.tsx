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
  LayoutGrid,
  List,
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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>RESOLVED</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
            <Clock className="w-3 h-3 text-cyan-600 animate-spin" />
            <span>IN PROGRESS</span>
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Users className="w-3 h-3 text-purple-600" />
            <span>ASSIGNED</span>
          </span>
        );
      case 'TRIAGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span>TRIAGED</span>
          </span>
        );
      case 'REJECTED':
      case 'DISMISSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>DISMISSED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>PENDING</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 font-mono">⚡ CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">▲ HIGH</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 font-mono">▽ LOW</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 font-mono">● MEDIUM</span>;
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. Top Title & Quick Actions Banner (Light Executive Admin Theme) ── */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
              <MessageSquareWarning className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Citizen Complaints &amp; Grievance Registry
              </h2>
              <p className="text-xs text-slate-500">
                Centralized municipal grievance ledger in DynamoDB table <code className="text-blue-600 font-mono font-semibold">Complaints</code> with photo evidence in S3 bucket <code className="text-blue-600 font-mono font-semibold">waterq-dev-complaints-evidence</code>.
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
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-200 shadow-xs"
              title="Refresh complaints from central database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-200 shadow-xs"
            title="Export filtered complaints to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {onCreateComplaint && (
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer border-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Citizen Grievance</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. KPI Metrics Grid (Executive pastel cards matching Alerts & Reports) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100/90 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-blue-700">Total Grievances</div>
          <div className="text-2xl font-black text-slate-900">{kpiMetrics.total}</div>
          <div className="text-[10px] text-slate-500">All 66 wards</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100/90 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Pending Review</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{kpiMetrics.pending}</div>
          <div className="text-[10px] text-slate-500">Awaiting triage</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-100/90 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-cyan-700">Under Inspection</div>
          <div className="text-2xl font-black text-slate-900">{kpiMetrics.inProgress}</div>
          <div className="text-[10px] text-slate-500">Field crew on-site</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100/90 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-emerald-700">Resolved &amp; Closed</div>
          <div className="text-2xl font-black text-slate-900">{kpiMetrics.resolved}</div>
          <div className="text-[10px] text-slate-500">{kpiMetrics.resolutionRate}% resolution rate</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100/90 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-rose-700">Critical Outages</div>
          <div className="text-2xl font-black text-slate-900">{kpiMetrics.critical}</div>
          <div className="text-[10px] text-slate-500">Burst / Sewage leak</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100/90 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-purple-700">S3 Evidence Files</div>
          <div className="text-2xl font-black text-slate-900">
            {complaints.filter(c => c.s3Key || c.photoName).length}
          </div>
          <div className="text-[10px] text-slate-500">Photos &amp; telemetry</div>
        </div>
      </div>

      {/* ── 3. Filters & Search Controls ── */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by reference (AA-CMP-...), citizen name, phone, ward, details..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
            />
          </div>

          {/* Quick Filter Selects & View Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 transition cursor-pointer shadow-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Dismissed</option>
            </select>

            {/* Priority */}
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 transition cursor-pointer shadow-xs"
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
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 transition cursor-pointer shadow-xs max-w-[160px]"
            >
              <option value="ALL">All Categories</option>
              <option value="Water quality concern">Water quality</option>
              <option value="Turbid / Muddy water">Turbid / Muddy</option>
              <option value="Chemical odor / Chlorine depletion">Chemical odor</option>
              <option value="Pipeline burst / Leakage">Pipeline burst</option>
              <option value="Sewage cross-contamination concern">Sewage leak</option>
              <option value="Low pressure / No supply">Low pressure</option>
              <option value="Saline / High TDS taste">High TDS</option>
            </select>

            {/* Ward */}
            <select
              value={wardFilter}
              onChange={e => setWardFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 transition cursor-pointer shadow-xs max-w-[140px]"
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
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4A. Complaints Data Table View ── */}
      {viewMode === 'table' ? (
        <div className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/90 text-[11px] font-mono text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Complaint ID</th>
                  <th className="py-3.5 px-4 font-bold">Ward / Location</th>
                  <th className="py-3.5 px-4 font-bold">Category</th>
                  <th className="py-3.5 px-4 font-bold">Citizen Details</th>
                  <th className="py-3.5 px-4 font-bold">Evidence</th>
                  <th className="py-3.5 px-4 font-bold">Priority</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Assigned To</th>
                  <th className="py-3.5 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(comp => (
                  <tr
                    key={comp.complaintId || comp.reference}
                    className="hover:bg-slate-50/80 transition"
                  >
                    {/* ID */}
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                      {comp.reference || comp.complaintId}
                    </td>

                    {/* Ward */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                        <MapPin className="w-3 h-3 text-cyan-600" />
                        <span>Ward {String(comp.wardNumber).padStart(2, '0')}</span>
                      </span>
                      <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                        {comp.sourceName || `gmc-ward-${comp.wardNumber}`}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900">
                      {comp.category}
                    </td>

                    {/* Citizen details & snippet */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{comp.citizenName || 'Citizen Reporter'}</div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 max-w-[260px]">
                        {comp.details}
                      </p>
                      {comp.citizenPhone && (
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          <span>{comp.citizenPhone}</span>
                        </span>
                      )}
                    </td>

                    {/* S3 Evidence */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {comp.s3Key || comp.photoName ? (
                        <div className="flex items-center gap-1.5">
                          <span className="p-1 rounded-md bg-purple-50 border border-purple-200 text-purple-700">
                            <Camera className="w-3.5 h-3.5" />
                          </span>
                          <div className="text-[10px] text-slate-600">
                            <span className="text-purple-700 font-mono truncate max-w-[100px] block font-semibold">
                              {comp.photoName || 'photo.jpg'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No image</span>
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
                    <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                      {comp.assignedTo && comp.assignedTo !== 'Unassigned' ? (
                        <span className="text-indigo-700 font-semibold">{comp.assignedTo}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDossier(comp)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition cursor-pointer border border-blue-200 shadow-xs"
                          title="Inspect full dossier and update resolution status"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(comp)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer border border-rose-200 shadow-xs"
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
      ) : (
        /* ── 4B. Complaints Compact Cards Grid View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map(comp => (
            <article
              key={comp.complaintId || comp.reference}
              className="bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-md rounded-2xl p-4 transition space-y-2.5 shadow-xs"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono font-bold text-blue-600 text-xs truncate">
                    {comp.reference || comp.complaintId}
                  </span>
                  <span className="text-[10px] font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-1.5 py-0.2 rounded font-mono shrink-0">
                    W{String(comp.wardNumber).padStart(2, '0')}
                  </span>
                </div>
                <div className="shrink-0">{getStatusBadge(comp.status)}</div>
              </div>

              {/* Title & Priority */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <strong className="text-slate-900 font-bold truncate">{comp.category}</strong>
                {getPriorityBadge(comp.priority)}
              </div>

              {/* Details Snippet */}
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {comp.details}
              </p>

              {/* Compact Meta Row */}
              <div className="flex items-center gap-1.5 flex-wrap text-[10px] pt-1 border-t border-slate-100 text-slate-500">
                {comp.citizenName && (
                  <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-700">
                    <span>{comp.citizenName}</span>
                  </span>
                )}
                {comp.photoName && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-mono font-semibold">
                    <Camera className="w-2.5 h-2.5" />
                    <span>Evidence</span>
                  </span>
                )}
                {comp.assignedTo && comp.assignedTo !== 'Unassigned' && (
                  <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                    <Users className="w-2.5 h-2.5" />
                    <span className="truncate max-w-[100px]">{comp.assignedTo}</span>
                  </span>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                <span>{new Date(comp.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenDossier(comp)}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 transition text-[11px]"
                  >
                    Inspect
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(comp)}
                    className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                    title="Dismiss"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </article>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
              No citizen complaints found matching your criteria.
            </div>
          )}
        </div>
      )}

      {/* ── 5. Dossier & Resolution Modal (Light Executive Theme) ── */}
      {isDossierOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-in zoom-in-95 text-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedComplaint.reference || selectedComplaint.complaintId}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Ward {String(selectedComplaint.wardNumber).padStart(2, '0')}
                  </span>
                  {getPriorityBadge(selectedComplaint.priority)}
                </div>
                <h3 className="text-base font-bold text-slate-900 pt-1">
                  {selectedComplaint.category}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDossierOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Citizen Description Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Citizen Grievance Description
              </div>
              <p className="text-xs text-slate-800 leading-relaxed font-normal">
                {selectedComplaint.details}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px]">Reporter:</span>{' '}
                  <strong className="text-slate-900">{selectedComplaint.citizenName || 'Citizen Reporter'}</strong>
                </div>
                {selectedComplaint.citizenPhone && (
                  <div>
                    <span className="text-slate-500 text-[11px]">Phone:</span>{' '}
                    <strong className="text-slate-900 font-mono">{selectedComplaint.citizenPhone}</strong>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 text-[11px]">Logged At:</span>{' '}
                  <span className="text-slate-700 font-mono">{new Date(selectedComplaint.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Target Main:</span>{' '}
                  <span className="text-slate-700">{selectedComplaint.sourceName || `Ward ${selectedComplaint.wardNumber}`}</span>
                </div>
              </div>
            </div>

            {/* Attached S3 Evidence Preview */}
            {(selectedComplaint.s3Key || selectedComplaint.photoName || selectedComplaint.photoUrl) && (
              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-purple-600" />
                    <span>Evidence Attached in Dedicated Complaints Bucket</span>
                  </span>
                  <span className="font-mono text-[10px] text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                    waterq-dev-complaints-evidence
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono break-all">
                  Object Key: <span className="text-blue-700 font-semibold">{selectedComplaint.s3Key || `complaints/evidence/${selectedComplaint.complaintId}.jpg`}</span>
                </div>
                {selectedComplaint.photoUrl && (
                  <div className="pt-2">
                    <img
                      src={selectedComplaint.photoUrl}
                      alt="Citizen complaint evidence"
                      className="max-h-48 rounded-lg border border-slate-200 object-cover"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Resolution & Assignment Controls */}
            <div className="space-y-3 pt-1">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Municipal Action &amp; Status Update
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">Investigation Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as ComplaintStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition cursor-pointer"
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
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">Priority Override</label>
                  <select
                    value={editPriority}
                    onChange={e => setEditPriority(e.target.value as ComplaintPriority)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="CRITICAL">⚡ Critical</option>
                    <option value="HIGH">▲ High</option>
                    <option value="MEDIUM">● Medium</option>
                    <option value="LOW">▽ Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-semibold block mb-1">Assigned Surveillance Engineer / Field Squad</label>
                <input
                  type="text"
                  value={editAssignedTo}
                  onChange={e => setEditAssignedTo(e.target.value)}
                  placeholder="e.g. Er. R. K. Sharma (Lashkar Central) or Pipeline Squad #2"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-semibold block mb-1">Resolution Findings / Corrective Action Notes</label>
                <textarea
                  value={editResolutionNotes}
                  onChange={e => setEditResolutionNotes(e.target.value)}
                  rows={3}
                  placeholder="Record corrective actions taken (e.g. valve replaced, line flushed, chemical dosing adjusted, water quality re-verified under IS 10500)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleDelete(selectedComplaint)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition cursor-pointer border border-rose-200 flex items-center gap-1.5 shadow-xs"
                title="Dismiss and purge this complaint record"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Dismiss Grievance</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDossierOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDossier}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
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
        </div>
      )}

      {/* ── 6. Log New Citizen Grievance Modal (Staff Intake) ── */}
      {isNewModalOpen && onCreateComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in zoom-in-95 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Log Citizen Grievance (Staff Intake)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition"
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
                <label className="text-slate-600 font-semibold block mb-1">Administrative Ward</label>
                <select name="wardNumber" required defaultValue="14" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-blue-500">
                  {GWALIOR_WARDS_66.map(w => (
                    <option key={w.wardNumber} value={w.wardNumber}>
                      Ward {String(w.wardNumber).padStart(2, '0')} - {w.name.split(' - ')[1]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Issue Category</label>
                <select name="category" required defaultValue="Turbid / Muddy water" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-blue-500">
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
                <label className="text-slate-600 font-semibold block mb-1">Citizen Full Name</label>
                <input name="citizenName" placeholder="e.g. Ramesh Chandra Sharma" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-blue-500" />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Mobile Contact</label>
                <input name="citizenPhone" placeholder="e.g. +91 98261 45890" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-blue-500" />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Complaint Details</label>
                <textarea name="details" required rows={3} placeholder="Describe location, observations, and initial instructions..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-blue-500" />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setIsNewModalOpen(false)} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs">Record Grievance</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsView;
