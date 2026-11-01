import { useState } from 'react';
import type { FC } from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  FlaskConical,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Shield,
  Upload,
  User,
  Wrench,
} from 'lucide-react';

interface ActionItem {
  actionId: string;
  alertId: string;
  source: string;
  actionType: 'Collect Lab Sample' | 'Resample & Test' | 'Site Investigation' | 'Remediation' | 'Public Notice';
  status: 'In Progress' | 'Completed' | 'Pending Lab';
  assignedTo: string;
  updatedAt: string;
  createdAt: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  timeline: {
    title: string;
    time?: string;
    statusBadge?: string;
    desc: string;
    state: 'done' | 'current' | 'pending';
  }[];
}

const RESPONSE_ACTIONS: ActionItem[] = [
  {
    actionId: 'RA-2026-0108',
    alertId: 'ALT-2026-0158',
    source: 'A-04 (Jhansi)',
    actionType: 'Collect Lab Sample',
    status: 'In Progress',
    assignedTo: 'Meera S.',
    updatedAt: '01 Nov, 07:55 PM',
    createdAt: '01 Nov 2026, 07:55 PM',
    priority: 'High',
    description: 'Dispatch field sampling operator for high pH anomaly verification at Hand Pump A-04.',
    timeline: [
      { title: 'Action Created', time: '01 Nov, 07:55 PM', desc: 'Response action recorded for the alert.', state: 'done' },
      { title: 'Field Sample Collection', statusBadge: 'In Progress', desc: 'Team dispatched for sample collection.', state: 'current' },
      { title: 'Lab Verification', desc: 'Awaiting lab test results.', state: 'pending' },
      { title: 'Closure', desc: 'Mark as completed after verification and required action.', state: 'pending' },
    ],
  },
  {
    actionId: 'RA-2026-0107',
    alertId: 'ALT-2026-0157',
    source: 'B-02 (Orchha)',
    actionType: 'Resample & Test',
    status: 'In Progress',
    assignedTo: 'Rohit K.',
    updatedAt: '01 Nov, 06:40 PM',
    createdAt: '01 Nov 2026, 06:30 PM',
    priority: 'High',
    description: 'Field resampling for turbidity spike (12.6 NTU) following heavy surface runoff.',
    timeline: [
      { title: 'Action Created', time: '01 Nov, 06:30 PM', desc: 'Turbidity threshold breach triggered alert.', state: 'done' },
      { title: 'Field Resampling Dispatched', statusBadge: 'In Progress', desc: 'Operator taking second verification sample.', state: 'current' },
      { title: 'Turbidity Calibration', desc: 'Turbidity meter cross-calibration in progress.', state: 'pending' },
      { title: 'Closure', desc: 'Review against permissible drinking limits.', state: 'pending' },
    ],
  },
  {
    actionId: 'RA-2026-0106',
    alertId: 'ALT-2026-0156',
    source: 'C-01 (Datia)',
    actionType: 'Site Investigation',
    status: 'Completed',
    assignedTo: 'Anita P.',
    updatedAt: '01 Nov, 05:20 PM',
    createdAt: '01 Nov 2026, 04:30 PM',
    priority: 'Medium',
    description: 'Inspect physical filtration barriers and pipeline seal for TDS 1,240 mg/L.',
    timeline: [
      { title: 'Action Created', time: '01 Nov, 04:30 PM', desc: 'High TDS alert flagged by screening team.', state: 'done' },
      { title: 'Physical Inspection', time: '01 Nov, 05:00 PM', desc: 'Visual inspection completed, no external breach.', state: 'done' },
      { title: 'Lab Verification', time: '01 Nov, 05:15 PM', desc: 'Confirmed secondary minerals within safe margins.', state: 'done' },
      { title: 'Closure', time: '01 Nov, 05:20 PM', desc: 'Closed with maintenance note recorded.', state: 'done' },
    ],
  },
  {
    actionId: 'RA-2026-0105',
    alertId: 'ALT-2026-0155',
    source: 'D-03 (Lalitpur)',
    actionType: 'Remediation',
    status: 'Pending Lab',
    assignedTo: 'Vikash T.',
    updatedAt: '01 Nov, 04:10 PM',
    createdAt: '01 Nov 2026, 03:00 PM',
    priority: 'High',
    description: 'Chemical dosing and backwashing of community tap filter media.',
    timeline: [
      { title: 'Action Created', time: '01 Nov, 03:00 PM', desc: 'Low pH (6.3) alert logged.', state: 'done' },
      { title: 'Dosing Scheduled', time: '01 Nov, 03:40 PM', desc: 'Alkaline neutralizer buffer applied.', state: 'done' },
      { title: 'Post-Remediation Lab Sample', statusBadge: 'Pending Lab', desc: 'Water sample sent to central lab for verification.', state: 'current' },
      { title: 'Closure', desc: 'Pending lab release confirmation.', state: 'pending' },
    ],
  },
  {
    actionId: 'RA-2026-0104',
    alertId: 'ALT-2026-0154',
    source: 'E-05 (Jhansi)',
    actionType: 'Public Notice',
    status: 'Completed',
    assignedTo: 'Meera S.',
    updatedAt: '01 Nov, 02:35 PM',
    createdAt: '01 Nov 2026, 01:15 PM',
    priority: 'Critical',
    description: 'Issue precautionary boil-water advisory SMS to community ward 12.',
    timeline: [
      { title: 'Action Created', time: '01 Nov, 01:15 PM', desc: 'Bacteria detected in biological screening.', state: 'done' },
      { title: 'Notice Prepared', time: '01 Nov, 01:45 PM', desc: 'Advisory notice drafted and approved.', state: 'done' },
      { title: 'Broadcast Sent', time: '01 Nov, 02:10 PM', desc: 'SMS sent to 450 registered citizen contacts.', state: 'done' },
      { title: 'Closure', time: '01 Nov, 02:35 PM', desc: 'Signed off and archived into incident file.', state: 'done' },
    ],
  },
];

const STATUS_PILLS: Record<string, string> = {
  'In Progress': 'bg-amber-100 text-amber-800 border-amber-200',
  'Completed': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Pending Lab': 'bg-purple-100 text-purple-800 border-purple-200',
};

const ACTION_TYPE_ICONS: Record<string, JSX.Element> = {
  'Collect Lab Sample': <FlaskConical className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
  'Resample & Test': <FlaskConical className="w-3.5 h-3.5 text-sky-600 shrink-0" />,
  'Site Investigation': <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
  'Remediation': <Wrench className="w-3.5 h-3.5 text-purple-600 shrink-0" />,
  'Public Notice': <Bell className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
};

export const ResponseActionsView: FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'timeline'>('list');
  const [selectedId, setSelectedId] = useState('RA-2026-0108');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [assignedFilter, setAssignedFilter] = useState('All Users');

  const selected = RESPONSE_ACTIONS.find(a => a.actionId === selectedId) ?? RESPONSE_ACTIONS[0];

  const filtered = RESPONSE_ACTIONS.filter(item => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      item.actionId.toLowerCase().includes(q) ||
      item.alertId.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      item.assignedTo.toLowerCase().includes(q);
    const matchType = typeFilter === 'All Types' || item.actionType === typeFilter;
    const matchStatus = statusFilter === 'All Statuses' || item.status === statusFilter;
    const matchAssigned = assignedFilter === 'All Users' || item.assignedTo.includes(assignedFilter);
    return matchSearch && matchType && matchStatus && matchAssigned;
  });

  return (
    <div className="space-y-4 font-sans">
      {/* ── KPI CARDS (Matching Screenshot 1) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            icon: <ClipboardList className="w-5 h-5" />,
            bg: 'bg-blue-50',
            iconBg: 'bg-blue-100 text-blue-600',
            label: 'Total Actions',
            value: '68',
            sub: '▲ +12',
            subClr: 'text-emerald-600',
            desc: '(This month)',
          },
          {
            icon: <Play className="w-5 h-5 fill-current" />,
            bg: 'bg-amber-50',
            iconBg: 'bg-amber-100 text-amber-600',
            label: 'In Progress',
            value: '15',
            sub: '(22.1%)',
            subClr: 'text-amber-700',
            desc: '',
          },
          {
            icon: <FlaskConical className="w-5 h-5" />,
            bg: 'bg-purple-50',
            iconBg: 'bg-purple-100 text-purple-600',
            label: 'Lab Verification',
            value: '12',
            sub: '(17.6%)',
            subClr: 'text-purple-700',
            desc: '',
          },
          {
            icon: <CheckCircle2 className="w-5 h-5 fill-current" />,
            bg: 'bg-emerald-50',
            iconBg: 'bg-emerald-100 text-emerald-600',
            label: 'Completed',
            value: '37',
            sub: '(54.4%)',
            subClr: 'text-emerald-700',
            desc: '',
          },
          {
            icon: <Clock className="w-5 h-5" />,
            bg: 'bg-rose-50',
            iconBg: 'bg-rose-100 text-rose-600',
            label: 'Overdue',
            value: '4',
            sub: '(5.9%)',
            subClr: 'text-rose-600',
            desc: '',
          },
        ].map(c => (
          <div key={c.label} className={`${c.bg} border border-slate-100 rounded-2xl p-4 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${c.iconBg} flex items-center justify-center shrink-0`}>
                {c.icon}
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-600">{c.label}</div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-2xl font-black text-slate-900">{c.value}</span>
                  {c.sub && <span className={`text-[11px] font-bold ${c.subClr}`}>{c.sub}</span>}
                </div>
                {c.desc && <div className="text-[10px] text-slate-500">{c.desc}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TABS: Action List (68) & Action Timeline ── */}
      <div className="flex border-b border-slate-200 gap-1">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'list'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" /> Action List (68)
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'timeline'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Action Timeline
        </button>
      </div>

      {/* ── FILTERS ── */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Action ID, Alert ID, or Source…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          />
        </div>
        {[
          {
            label: 'Action Type',
            val: typeFilter,
            set: setTypeFilter,
            opts: ['All Types', 'Collect Lab Sample', 'Resample & Test', 'Site Investigation', 'Remediation', 'Public Notice'],
          },
          {
            label: 'Status',
            val: statusFilter,
            set: setStatusFilter,
            opts: ['All Statuses', 'In Progress', 'Completed', 'Pending Lab'],
          },
          {
            label: 'Assigned To',
            val: assignedFilter,
            set: setAssignedFilter,
            opts: ['All Users', 'Meera S.', 'Rohit K.', 'Anita P.', 'Vikash T.'],
          },
        ].map(f => (
          <div key={f.label} className="flex flex-col">
            <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">{f.label}</span>
            <select
              value={f.val}
              onChange={e => f.set(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
            >
              {f.opts.map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}
        {/* Date Range */}
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">Date Range</span>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>01 Oct 2026 – 01 Nov 2026</span>
          </div>
        </div>
        <button
          onClick={() => {
            setSearch('');
            setTypeFilter('All Types');
            setStatusFilter('All Statuses');
            setAssignedFilter('All Users');
          }}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 mt-4 ml-1"
        >
          Clear
        </button>
        <button className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg mt-4 transition ml-auto">
          <Plus className="w-3.5 h-3.5" /> Record Action
        </button>
      </div>

      {/* ── TWO-COLUMN VIEW: Table on Left, Details on Right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Actions Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Response Actions ({filtered.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 text-[11px] font-semibold">
                  <th className="py-2.5 px-3">Action ID</th>
                  <th className="py-2.5 px-3">Alert ID</th>
                  <th className="py-2.5 px-3">Source / Location</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Assigned To</th>
                  <th className="py-2.5 px-3">Updated At</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(item => (
                  <tr
                    key={item.actionId}
                    onClick={() => setSelectedId(item.actionId)}
                    className={`cursor-pointer transition ${
                      selectedId === item.actionId ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{item.actionId}</td>
                    <td className="py-2.5 px-3 font-mono text-blue-600 font-medium">{item.alertId}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{item.source}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        {ACTION_TYPE_ICONS[item.actionType]}
                        <span>{item.actionType}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          STATUS_PILLS[item.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{item.assignedTo}</td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">{item.updatedAt}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Showing 1 – {filtered.length} of 68 actions</span>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded text-slate-400 hover:text-slate-600">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-7 h-7 rounded-lg bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                1
              </button>
              <button className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] flex items-center justify-center">
                2
              </button>
              <button className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] flex items-center justify-center">
                3
              </button>
              <span className="text-slate-400 text-xs px-1">...</span>
              <button className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] flex items-center justify-center">
                14
              </button>
              <button className="p-1 rounded text-slate-400 hover:text-slate-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Action Details Panel */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Action Details: {selected.actionId}</h3>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                STATUS_PILLS[selected.status] ?? 'bg-slate-100 text-slate-600'
              }`}
            >
              {selected.status}
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* Meta Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
              <div className="flex items-start gap-1.5 text-slate-600">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-rose-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Alert ID</div>
                  <a href={`#alert-${selected.alertId}`} className="text-blue-600 font-bold hover:underline">
                    {selected.alertId}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-slate-600">
                <Calendar className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Created At</div>
                  <div className="font-medium text-slate-800">{selected.createdAt}</div>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Source</div>
                  <div className="font-medium text-slate-800">{selected.source}</div>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-slate-600">
                <User className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Assigned To</div>
                  <div className="font-medium text-slate-800">{selected.assignedTo}</div>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-slate-600">
                <FlaskConical className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Action Type</div>
                  <div className="font-medium text-slate-800">{selected.actionType}</div>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-slate-600">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Priority</div>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                    {selected.priority}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress & Timeline */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-3">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Progress &amp; Timeline</span>
              </div>

              <div className="relative pl-5 space-y-4">
                {/* Vertical line connecting nodes */}
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />

                {selected.timeline.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-3">
                    {/* Status node */}
                    {step.state === 'done' ? (
                      <div className="absolute -left-5 top-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-4 ring-white shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                    ) : step.state === 'current' ? (
                      <div className="absolute -left-5 top-0.5 w-4 h-4 rounded-full border-2 border-blue-600 bg-white flex items-center justify-center ring-4 ring-white shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      </div>
                    ) : (
                      <div className="absolute -left-5 top-0.5 w-4 h-4 rounded-full border-2 border-slate-300 bg-white ring-4 ring-white shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-800">{step.title}</div>
                        {step.time && <div className="text-[10px] text-slate-400">{step.time}</div>}
                        {step.statusBadge && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            {step.statusBadge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons Footer (Matching mockup) */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2 flex-wrap bg-slate-50/50 rounded-b-2xl">
            <button className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition shadow-xs">
              <FileText className="w-3.5 h-3.5" /> Update Status
            </button>
            <button className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg transition bg-white shadow-xs">
              <Upload className="w-3.5 h-3.5" /> Upload Evidence
            </button>
            <button className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg transition bg-white shadow-xs">
              <MessageSquare className="w-3.5 h-3.5" /> Add Note
            </button>
            <button className="ml-auto p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition bg-white shadow-xs">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
