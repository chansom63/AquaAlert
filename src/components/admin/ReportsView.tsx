import { useState } from 'react';
import type { FC } from 'react';
import {
  AlertTriangle, BarChart3, ChevronLeft, ChevronRight,
  Download, Eye, FileText, FlaskConical, MoreHorizontal, Plus, Search, Share2,
} from 'lucide-react';

interface ReportRow {
  reportId: string;
  name: string;
  type: 'Summary' | 'Incident' | 'Lab' | 'Monitoring';
  period: string;
  generatedBy: string;
  status: 'Completed' | 'In Progress' | 'Failed';
  generatedAt?: string;
  sourcesCovered?: number;
  parameters?: string;
  description?: string;
}

const REPORTS: ReportRow[] = [
  { reportId: 'REP-20261101-001', name: 'Monthly Water Quality Summary',         type: 'Summary',    period: 'Oct 2026',          generatedBy: 'Admin User', status: 'Completed', generatedAt: '01 Nov 2026, 10:24 AM', sourcesCovered: 148, parameters: 'pH, TDS, Turbidity, Bacteria, Nitrate', description: 'Consolidated water quality overview, key findings, alerts, and response actions for Oct 2026.' },
  { reportId: 'REP-20261028-004', name: 'Incident Report – A-04 (pH)',            type: 'Incident',   period: '28 Oct 2026',        generatedBy: 'Meera S.',   status: 'Completed', generatedAt: '28 Oct 2026, 02:10 PM', sourcesCovered: 1,   parameters: 'pH', description: 'Detailed incident report for ALT-2026-0158 pH anomaly at Jhansi source A-04.' },
  { reportId: 'REP-20261027-003', name: 'Lab Verification Report (ALT-2026-0158)',type: 'Lab',        period: '27 Oct 2026',        generatedBy: 'Rohit K.',   status: 'Completed', generatedAt: '27 Oct 2026, 11:30 AM', sourcesCovered: 3,   parameters: 'pH, TDS, Bacteria', description: 'Independent laboratory verification report for cross-source contamination assessment.' },
  { reportId: 'REP-20261026-002', name: 'Source Monitoring – Jhansi (A-04)',       type: 'Monitoring', period: '20–26 Oct 2026',     generatedBy: 'Anita P.',   status: 'Completed', generatedAt: '26 Oct 2026, 04:45 PM', sourcesCovered: 1,   parameters: 'pH, Turbidity, Chlorine', description: 'Weekly source-level monitoring trend report for Jhansi Hand Pump A-04.' },
  { reportId: 'REP-20261020-001', name: 'Water Quality Trend (Last 30 Days)',      type: 'Summary',    period: '21 Sep – 20 Oct 2026', generatedBy: 'Admin User', status: 'Completed', generatedAt: '20 Oct 2026, 09:15 AM', sourcesCovered: 148, parameters: 'pH, TDS, Turbidity', description: 'Trend analysis of 30-day water quality across all 148 registered sources.' },
];

const TYPE_STYLES: Record<string, string> = {
  'Summary':    'bg-blue-100 text-blue-700',
  'Incident':   'bg-rose-100 text-rose-700',
  'Lab':        'bg-amber-100 text-amber-800',
  'Monitoring': 'bg-purple-100 text-purple-700',
};
const TYPE_ICONS: Record<string, string> = {
  'Summary':    '📊',
  'Incident':   '⚠️',
  'Lab':        '🔬',
  'Monitoring': '📈',
};

type TabType = 'all' | 'monitoring' | 'incidents' | 'lab' | 'summaries';

export const ReportsView: FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedId, setSelectedId] = useState('REP-20261101-001');
  const [typeFilter, setTypeFilter]   = useState('All Types');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [search, setSearch]           = useState('');

  const selected = REPORTS.find(r => r.reportId === selectedId) ?? REPORTS[0];

  const tabFilter = (r: ReportRow): boolean => {
    if (activeTab === 'all')        return true;
    if (activeTab === 'monitoring') return r.type === 'Monitoring';
    if (activeTab === 'incidents')  return r.type === 'Incident';
    if (activeTab === 'lab')        return r.type === 'Lab';
    if (activeTab === 'summaries')  return r.type === 'Summary';
    return true;
  };

  const filtered = REPORTS.filter(r =>
    tabFilter(r) &&
    (!search || r.reportId.toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase()) || r.generatedBy.toLowerCase().includes(search.toLowerCase())) &&
    (typeFilter === 'All Types' || r.type === typeFilter) &&
    (sourceFilter === 'All Sources' || true)
  );

  return (
    <div className="space-y-4 font-sans">
      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { icon: <FileText     className="w-5 h-5"/>, bg: 'bg-blue-50',   iconBg: 'bg-blue-100 text-blue-600',    label: 'Total Reports',      value: '42', sub: '▲ +8', subC: 'text-emerald-600', desc: '(This month)' },
          { icon: <BarChart3    className="w-5 h-5"/>, bg: 'bg-purple-50', iconBg: 'bg-purple-100 text-purple-600',label: 'Monitoring Reports',  value: '18', sub: '(42.9%)', subC: 'text-purple-600', desc: '' },
          { icon: <AlertTriangle className="w-5 h-5"/>,bg: 'bg-rose-50',   iconBg: 'bg-rose-100 text-rose-600',    label: 'Incident Reports',   value: '7',  sub: '(16.7%)', subC: 'text-rose-600', desc: '' },
          { icon: <FlaskConical  className="w-5 h-5"/>,bg: 'bg-amber-50',  iconBg: 'bg-amber-100 text-amber-600',  label: 'Lab Reports',        value: '12', sub: '(28.6%)', subC: 'text-amber-600', desc: '' },
          { icon: <FileText     className="w-5 h-5"/>, bg: 'bg-emerald-50',iconBg: 'bg-emerald-100 text-emerald-600',label:'Summary Reports',    value: '5',  sub: '(11.9%)', subC: 'text-emerald-600', desc: '' },
        ].map(c => (
          <div key={c.label} className={`${c.bg} border border-slate-100 rounded-2xl p-4 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${c.iconBg} flex items-center justify-center shrink-0`}>{c.icon}</div>
              <div>
                <div className="text-[11px] font-semibold text-slate-600">{c.label}</div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-2xl font-black text-slate-900">{c.value}</span>
                  <span className={`text-[11px] font-bold ${c.subC}`}>{c.sub}</span>
                </div>
                {c.desc && <div className="text-[10px] text-slate-500">{c.desc}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="flex border-b border-slate-200 gap-0.5 flex-wrap">
        {([
          ['all',        'All Reports (42)',    <BarChart3   className="w-3.5 h-3.5"/>],
          ['monitoring', 'Monitoring (18)',     <BarChart3   className="w-3.5 h-3.5"/>],
          ['incidents',  'Incidents (7)',       <AlertTriangle className="w-3.5 h-3.5"/>],
          ['lab',        'Lab Reports (12)',    <FlaskConical  className="w-3.5 h-3.5"/>],
          ['summaries',  'Summaries (5)',       <FileText      className="w-3.5 h-3.5"/>],
        ] as [TabType, string, JSX.Element][]).map(([t, label, icon]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${activeTab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── FILTERS ── */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" placeholder="Search by Report Name, Report ID, or Source ID…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-72 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
        </div>
        {[
          { label: 'Report Type', val: typeFilter,   set: setTypeFilter,   opts: ['All Types','Summary','Monitoring','Incident','Lab'] },
          { label: 'Source',      val: sourceFilter, set: setSourceFilter, opts: ['All Sources','A-04','B-02','C-01'] },
        ].map(f => (
          <div key={f.label} className="flex flex-col">
            <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">{f.label}</span>
            <select value={f.val} onChange={e => f.set(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer">
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        {/* Date Range */}
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">Date Range</span>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-600">
            <span>📅</span><span>01 Oct 2026 – 01 Nov 2026</span>
          </div>
        </div>
        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 mt-4">Clear</button>
        <button className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg mt-4 transition">
          <Plus className="w-3.5 h-3.5" /> Generate Report
        </button>
      </div>

      {/* ── TWO-COLUMN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Reports Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Reports ({filtered.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 text-[11px] font-semibold">
                  <th className="py-2.5 px-3"><input type="checkbox" className="rounded" /></th>
                  <th className="py-2.5 px-3">Report ID</th>
                  <th className="py-2.5 px-3">Report Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">Generated By</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(r => (
                  <tr key={r.reportId} onClick={() => setSelectedId(r.reportId)}
                    className={`cursor-pointer transition ${selectedId === r.reportId ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}>
                    <td className="py-2.5 px-3"><input type="checkbox" className="rounded" onClick={e => e.stopPropagation()} /></td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800 text-[10px]">{r.reportId}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[140px]">
                      <span className="line-clamp-2">{r.name}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_STYLES[r.type]}`}>
                        {TYPE_ICONS[r.type]} {r.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap text-[11px]">{r.period}</td>
                    <td className="py-2.5 px-3 text-slate-600">{r.generatedBy}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : r.status === 'In Progress' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition" title="View"><Eye className="w-3.5 h-3.5" /></button>
                        <button className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition" title="Download"><Download className="w-3.5 h-3.5" /></button>
                        <button className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition" title="More"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Showing 1 – 5 of 42 reports</span>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
              {[1,2,3,4,5].map(n => (
                <button key={n} className={`w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center ${n===1?'bg-blue-600 text-white':'text-slate-500 hover:bg-slate-100'}`}>{n}</button>
              ))}
              <span className="text-slate-400 text-xs px-1">…</span>
              <button className="w-7 h-7 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-100 flex items-center justify-center">9</button>
              <button className="p-1 rounded text-slate-400"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* RIGHT: Report Detail */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Report Details</h3>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selected.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
              {selected.status}
            </span>
          </div>

          <div className="p-4 flex-1 space-y-4">
            {/* Report Title */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shrink-0">
                {TYPE_ICONS[selected.type]}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm leading-snug">{selected.name}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Report ID: {selected.reportId}</p>
              </div>
            </div>

            {/* Meta Fields */}
            <div className="space-y-2.5 text-xs">
              {[
                { icon: '📋', label: 'Report Type',     value: null, badge: selected.type },
                { icon: '📅', label: 'Period',          value: selected.period },
                { icon: '👤', label: 'Generated By',    value: selected.generatedBy },
                { icon: '🕐', label: 'Generated At',    value: selected.generatedAt },
                { icon: '💧', label: 'Sources Covered', value: `${selected.sourcesCovered}` },
                { icon: '🔬', label: 'Parameters',      value: selected.parameters },
              ].map(f => (
                <div key={f.label} className="flex items-start gap-3">
                  <span className="w-28 shrink-0 text-slate-400 font-medium">{f.icon} {f.label}</span>
                  {f.badge
                    ? <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_STYLES[f.badge]}`}>{TYPE_ICONS[f.badge]} {f.badge}</span>
                    : <span className="text-slate-800 font-medium leading-snug">{f.value}</span>
                  }
                </div>
              ))}
              {/* Description */}
              <div className="flex items-start gap-3">
                <span className="w-28 shrink-0 text-slate-400 font-medium">📝 Description</span>
                <span className="text-slate-700 leading-relaxed">{selected.description}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition">
              <Eye className="w-3.5 h-3.5" /> View Report
            </button>
            <button className="flex items-center gap-1.5 text-[11px] font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg transition">
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
            <button className="flex items-center gap-1.5 text-[11px] font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg transition">
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
