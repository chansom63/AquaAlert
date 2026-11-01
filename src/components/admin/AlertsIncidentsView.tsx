import { useState } from 'react';
import type { FC } from 'react';
import {
  AlertTriangle, Bell, CheckCircle2, ChevronLeft, ChevronRight,
  Download, Eye, FileText, FlaskConical, MapPin, MoreHorizontal,
  Plus, Search, Thermometer, X,
} from 'lucide-react';

interface AlertRow {
  id: string;
  source: string;
  location: string;
  parameter: string;
  paramValue: string;
  severity: 'Critical' | 'High' | 'Warning' | 'Info';
  status: 'Open' | 'Under Investigation' | 'Pending Lab' | 'Resolved';
  triggeredAt: string;
}

const ALERTS: AlertRow[] = [
  { id: 'ALT-2026-0158', source: 'A-04', location: 'Jhansi',   parameter: 'pH',       paramValue: '9.4',         severity: 'Critical', status: 'Open',                triggeredAt: '01 Nov 2026,\n07:45 PM' },
  { id: 'ALT-2026-0157', source: 'B-02', location: 'Orchha',   parameter: 'Turbidity',paramValue: '12.6 NTU',    severity: 'High',     status: 'Open',                triggeredAt: '01 Nov 2026,\n06:30 PM' },
  { id: 'ALT-2026-0156', source: 'C-01', location: 'Datia',    parameter: 'TDS',      paramValue: '1,240 mg/L',  severity: 'High',     status: 'Under Investigation', triggeredAt: '01 Nov 2026,\n05:55 PM' },
  { id: 'ALT-2026-0155', source: 'D-03', location: 'Lalitpur', parameter: 'pH',       paramValue: '6.3',         severity: 'Warning',  status: 'Pending Lab',         triggeredAt: '01 Nov 2026,\n05:10 PM' },
  { id: 'ALT-2026-0154', source: 'E-05', location: 'Jhansi',   parameter: 'Bacteria', paramValue: 'Detected',    severity: 'Warning',  status: 'Open',                triggeredAt: '01 Nov 2026,\n03:45 PM' },
];

const SEVERITY_STYLES: Record<string, string> = {
  Critical: 'bg-rose-600 text-white',
  High:     'bg-orange-500 text-white',
  Warning:  'bg-amber-400 text-amber-950',
  Info:     'bg-blue-100 text-blue-700',
};

const STATUS_STYLES: Record<string, string> = {
  'Open':                'bg-sky-100 text-sky-700',
  'Under Investigation': 'bg-amber-100 text-amber-800',
  'Pending Lab':         'bg-purple-100 text-purple-700',
  'Resolved':            'bg-emerald-100 text-emerald-700',
};

const SeverityBadge: FC<{ severity: string }> = ({ severity }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${SEVERITY_STYLES[severity] ?? 'bg-slate-100 text-slate-600'}`}>
    ▲ {severity}
  </span>
);
const StatusBadge: FC<{ status: string }> = ({ status }) => (
  <span className={`inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'}`}>
    {status}
  </span>
);

export const AlertsIncidentsView: FC = () => {
  const [activeTab, setActiveTab]       = useState<'alerts' | 'history'>('alerts');
  const [selectedId, setSelectedId]     = useState('ALT-2026-0158');
  const [severityFilter, setSeverityFilter] = useState('All Severities');
  const [statusFilter, setStatusFilter]     = useState('All Statuses');
  const [sourceFilter, setSourceFilter]     = useState('All Sources');
  const [search, setSearch]             = useState('');

  const selected = ALERTS.find(a => a.id === selectedId) ?? ALERTS[0];

  const filtered = ALERTS.filter(a => {
    const q = search.toLowerCase();
    const matchQ = !q || a.id.toLowerCase().includes(q) || a.source.toLowerCase().includes(q) || a.location.toLowerCase().includes(q) || a.parameter.toLowerCase().includes(q);
    const matchSev = severityFilter === 'All Severities' || a.severity === severityFilter;
    const matchStat = statusFilter === 'All Statuses' || a.status === statusFilter;
    const matchSrc = sourceFilter === 'All Sources' || a.source.includes(sourceFilter);
    return matchQ && matchSev && matchStat && matchSrc;
  });

  return (
    <div className="space-y-4 font-sans">
      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { icon: <AlertTriangle className="w-5 h-5 fill-current" />, bg: 'bg-rose-50', iconBg: 'bg-rose-100 text-rose-600', label: 'Active Alerts',         value: '5',  sub: '▲ +2', subClr: 'text-rose-600', desc: 'Requiring action' },
          { icon: <Thermometer   className="w-5 h-5" />,              bg: 'bg-amber-50',iconBg: 'bg-amber-100 text-amber-600',label: 'Under Investigation',   value: '3',  sub: '',     subClr: '',              desc: 'In progress' },
          { icon: <FlaskConical  className="w-5 h-5" />,              bg: 'bg-sky-50',  iconBg: 'bg-sky-100 text-sky-600',   label: 'Pending Lab',           value: '12', sub: '',     subClr: '',              desc: 'Awaiting verification' },
          { icon: <CheckCircle2  className="w-5 h-5 fill-current" />, bg: 'bg-emerald-50',iconBg:'bg-emerald-100 text-emerald-600',label:'Resolved (7 days)', value: '27', sub: '▲ +5', subClr: 'text-emerald-600',desc:'Closed incidents' },
          { icon: <FileText      className="w-5 h-5" />,              bg: 'bg-blue-50', iconBg: 'bg-blue-100 text-blue-600', label: 'Total Incidents',        value: '44', sub: '',     subClr: '',              desc: 'This month' },
        ].map(c => (
          <div key={c.label} className={`${c.bg} border border-slate-100 rounded-2xl p-4 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${c.iconBg} flex items-center justify-center shrink-0`}>{c.icon}</div>
              <div>
                <div className="text-[11px] font-semibold text-slate-600">{c.label}</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900">{c.value}</span>
                  {c.sub && <span className={`text-[11px] font-bold ${c.subClr}`}>{c.sub}</span>}
                </div>
                <div className="text-[10px] text-slate-500">{c.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="flex border-b border-slate-200 gap-1">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${activeTab === 'alerts' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Bell className="w-3.5 h-3.5" /> Alerts (5)
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${activeTab === 'history' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <FileText className="w-3.5 h-3.5" /> Incident History (39)
        </button>
      </div>

      {/* ── FILTERS ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Alert ID, Source ID, or Parameter…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          />
        </div>
        {[
          { label: 'Severity', val: severityFilter, set: setSeverityFilter, opts: ['All Severities','Critical','High','Warning','Info'] },
          { label: 'Status',   val: statusFilter,   set: setStatusFilter,   opts: ['All Statuses','Open','Under Investigation','Pending Lab','Resolved'] },
          { label: 'Source',   val: sourceFilter,   set: setSourceFilter,   opts: ['All Sources','A-04','B-02','C-01','D-03','E-05'] },
        ].map(f => (
          <div key={f.label} className="flex flex-col">
            <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">{f.label}</span>
            <select
              value={f.val}
              onChange={e => f.set(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
            >
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        {/* Date Range */}
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">Date Range</span>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-600">
            <span>📅</span>
            <span>01 Nov 2026 – 01 Nov 2026</span>
          </div>
        </div>
        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 mt-4 ml-1">Clear</button>
        <button className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg mt-4 transition">
          <Download className="w-3.5 h-3.5" /> Export (CSV)
        </button>
      </div>

      {/* ── MAIN TWO-COLUMN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Alert Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm">
          {/* Table Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="font-bold text-slate-900 text-sm">Active Alerts ({filtered.length})</h3>
            </div>
            <button className="flex items-center gap-1.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition">
              <Plus className="w-3.5 h-3.5" /> Create Incident
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 text-[11px] font-semibold">
                  <th className="py-2.5 px-3">Alert ID</th>
                  <th className="py-2.5 px-3">Source / Location</th>
                  <th className="py-2.5 px-3">Parameter (Value)</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Triggered At</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(a => (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={`cursor-pointer transition ${selectedId === a.id ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}
                  >
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{a.id}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{a.source} ({a.location})</td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {a.parameter}
                      <br />
                      <span className="font-bold text-rose-600">({a.paramValue})</span>
                    </td>
                    <td className="py-2.5 px-3"><SeverityBadge severity={a.severity} /></td>
                    <td className="py-2.5 px-3"><StatusBadge status={a.status} /></td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-pre-line text-[11px]">{a.triggeredAt}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <button className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"><Eye className="w-3.5 h-3.5" /></button>
                        <button className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Showing 1 – {filtered.length} of 5 alerts</span>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded text-slate-400 hover:text-slate-600"><ChevronLeft className="w-4 h-4" /></button>
              <button className="w-7 h-7 rounded-lg bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">1</button>
              <button className="p-1 rounded text-slate-400 hover:text-slate-600"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* RIGHT: Alert Detail Panel */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="font-bold text-slate-900 text-sm">Alert: {selected.id}</h3>
            </div>
            <SeverityBadge severity={selected.severity} />
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* Meta Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="flex items-start gap-1.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                <span><span className="text-slate-400">Source:</span> {selected.source} ({selected.location})</span>
              </div>
              <div className="flex items-start gap-1.5 text-slate-600">
                <span className="text-slate-400 shrink-0">📅</span>
                <span><span className="text-slate-400">Triggered:</span> {selected.triggeredAt.replace('\n', ' ')}</span>
              </div>
              <div className="flex items-start gap-1.5 text-slate-600">
                <Thermometer className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                <span><span className="text-slate-400">Parameter:</span> {selected.parameter}</span>
              </div>
              <div className="flex items-start gap-1.5 text-slate-600">
                <span className="text-slate-400 shrink-0">📊</span>
                <span><span className="text-slate-400">Value:</span> <span className="font-bold text-rose-600">{selected.paramValue}</span></span>
              </div>
              <div className="flex items-start gap-1.5 text-slate-600">
                <span className="text-slate-400 shrink-0">🔢</span>
                <span><span className="text-slate-400">Threshold:</span> 6.5 – 8.5</span>
              </div>
              <div className="flex items-start gap-1.5 text-slate-600">
                <span className="text-slate-400 shrink-0">🔵</span>
                <span><span className="text-slate-400">Status:</span> <StatusBadge status={selected.status} /></span>
              </div>
            </div>

            {/* Incident Timeline */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-2">
                <span>⚡</span> Incident Timeline
              </div>
              <div className="space-y-3 relative pl-4">
                {/* vertical line */}
                <div className="absolute left-1.5 top-2 bottom-2 w-px bg-slate-200" />
                {[
                  { dot: 'bg-rose-500', title: 'Alert Created', time: '01 Nov, 07:45 PM', desc: 'pH value 9.4 exceeds the permissible range (6.5 – 8.5).' },
                  { dot: 'bg-blue-400', title: 'Notification Sent (SNS)', time: '01 Nov, 07:46 PM', desc: 'Email sent to operations team.' },
                  { dot: 'bg-slate-300', title: 'Under Investigation', time: 'Pending', desc: 'Field team assigned for resampling and lab verification.' },
                ].map((t, i) => (
                  <div key={i} className="relative flex gap-3">
                    <div className={`w-3 h-3 rounded-full ${t.dot} ring-2 ring-white shrink-0 mt-0.5 -ml-1.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-800">{t.title}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{t.time}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked Evidence */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-2">
                🔗 Linked Evidence
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-800">field_report_A04.pdf</div>
                    <div className="text-[10px] text-slate-500">1.2 MB · Lab sample sheet</div>
                  </div>
                </div>
                <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition">
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            <button className="flex items-center gap-1.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition">
              <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledge
            </button>
            <button className="flex items-center gap-1.5 text-[11px] font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg transition">
              <FlaskConical className="w-3.5 h-3.5" /> Mark for Lab
            </button>
            <button className="flex items-center gap-1.5 text-[11px] font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg transition">
              <X className="w-3.5 h-3.5" /> Resolve
            </button>
            <button className="ml-auto p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
