import { useState } from 'react';
import type { FC } from 'react';
import {
  CheckCircle2, ChevronLeft, ChevronRight, Download, Eye,
  FlaskConical, MoreHorizontal, Plus, Search, XCircle,
} from 'lucide-react';

interface ReadingRow {
  readingId: string;
  source: string;
  parameter: string;
  value: string;
  unit: string;
  method: string;
  verificationStatus: 'Screening' | 'Lab Verified' | 'Pending Lab' | 'Rejected';
  collectedAt: string;
  receivedAt: string;
  anomaly: boolean;
}

const READINGS: ReadingRow[] = [
  { readingId: 'RD-2026-03124', source: 'A-04 (Jhansi)',   parameter: 'pH',        value: '9.4',      unit: '-',     method: 'Field Test', verificationStatus: 'Screening',    collectedAt: '01 Nov 2026, 07:40 PM', receivedAt: '01 Nov 2026, 07:45 PM', anomaly: true },
  { readingId: 'RD-2026-03123', source: 'B-02 (Orchha)',   parameter: 'Turbidity', value: '12.6',     unit: 'NTU',   method: 'Field Test', verificationStatus: 'Screening',    collectedAt: '01 Nov 2026, 06:28 PM', receivedAt: '01 Nov 2026, 06:30 PM', anomaly: true },
  { readingId: 'RD-2026-03122', source: 'C-01 (Datia)',    parameter: 'TDS',       value: '1,240',    unit: 'mg/L',  method: 'Lab Test',   verificationStatus: 'Lab Verified', collectedAt: '01 Nov 2026, 05:55 PM', receivedAt: '01 Nov 2026, 06:01 PM', anomaly: true },
  { readingId: 'RD-2026-03121', source: 'D-03 (Lalitpur)', parameter: 'pH',        value: '6.3',      unit: '-',     method: 'Field Test', verificationStatus: 'Screening',    collectedAt: '01 Nov 2026, 05:10 PM', receivedAt: '01 Nov 2026, 05:15 PM', anomaly: true },
  { readingId: 'RD-2026-03120', source: 'E-05 (Jhansi)',   parameter: 'Bacteria',  value: 'Detected', unit: '-',     method: 'Lab Test',   verificationStatus: 'Lab Verified', collectedAt: '01 Nov 2026, 03:45 PM', receivedAt: '01 Nov 2026, 03:50 PM', anomaly: true },
];

const VERIFICATION_STYLES: Record<string, string> = {
  'Screening':    'bg-sky-100 text-sky-700',
  'Lab Verified': 'bg-emerald-100 text-emerald-700',
  'Pending Lab':  'bg-amber-100 text-amber-800',
  'Rejected':     'bg-rose-100 text-rose-700',
};

export const ReadingsView: FC = () => {
  const [search, setSearch]         = useState('');
  const [paramFilter, setParamFilter]     = useState('All Parameters');
  const [verifFilter, setVerifFilter]     = useState('All Statuses');
  const [sourceFilter, setSourceFilter]   = useState('All Sources');

  const filtered = READINGS.filter(r => {
    const q = search.toLowerCase();
    return (
      (!q || r.readingId.toLowerCase().includes(q) || r.source.toLowerCase().includes(q) || r.parameter.toLowerCase().includes(q)) &&
      (paramFilter  === 'All Parameters' || r.parameter === paramFilter) &&
      (verifFilter  === 'All Statuses'   || r.verificationStatus === verifFilter) &&
      (sourceFilter === 'All Sources'    || r.source.startsWith(sourceFilter))
    );
  });

  return (
    <div className="space-y-4 font-sans">
      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { icon: <FlaskConical className="w-5 h-5"/>, bg: 'bg-blue-50',    iconBg: 'bg-blue-100 text-blue-600',    label: 'Total Readings', value: '2,846', sub: '▲ +128', subC: 'text-emerald-600', desc: '(Last 7 days)' },
          { icon: <CheckCircle2 className="w-5 h-5 fill-current"/>, bg: 'bg-emerald-50', iconBg: 'bg-emerald-100 text-emerald-600', label: 'Lab Verified', value: '1,932', sub: '(67.9%)', subC: 'text-emerald-600', desc: '' },
          { icon: <FlaskConical className="w-5 h-5"/>, bg: 'bg-sky-50',     iconBg: 'bg-sky-100 text-sky-600',      label: 'Screening',      value: '720',   sub: '(25.3%)', subC: 'text-sky-600',     desc: '' },
          { icon: <FlaskConical className="w-5 h-5"/>, bg: 'bg-amber-50',   iconBg: 'bg-amber-100 text-amber-600',  label: 'Pending Lab',    value: '124',   sub: '(4.4%)',  subC: 'text-amber-600',   desc: '' },
          { icon: <XCircle      className="w-5 h-5"/>, bg: 'bg-rose-50',    iconBg: 'bg-rose-100 text-rose-600',    label: 'Rejected',       value: '68',    sub: '(2.4%)',  subC: 'text-rose-600',    desc: '' },
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

      {/* ── FILTERS ── */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" placeholder="Search by Reading ID, Source ID or Location…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
        </div>
        {[
          { label: 'Parameter',            val: paramFilter,  set: setParamFilter,  opts: ['All Parameters','pH','Turbidity','TDS','Bacteria','Chlorine'] },
          { label: 'Verification Status',  val: verifFilter,  set: setVerifFilter,  opts: ['All Statuses','Screening','Lab Verified','Pending Lab','Rejected'] },
          { label: 'Source',               val: sourceFilter, set: setSourceFilter, opts: ['All Sources','A-04','B-02','C-01','D-03','E-05'] },
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
          <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">Collected At</span>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-600">
            <span>📅</span><span>01 Nov 2026 – 01 Nov 2026</span>
          </div>
        </div>
        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 mt-4">Clear</button>
        <button className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg mt-4 transition">
          Apply Filters
        </button>
      </div>

      {/* ── READINGS TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        {/* Table Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Readings ({filtered.length.toLocaleString()})</h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition">
              <Plus className="w-3.5 h-3.5" /> Add Reading
            </button>
            <button className="flex items-center gap-1.5 text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg transition">
              <Download className="w-3.5 h-3.5" /> Export (CSV)
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 text-[11px] font-semibold">
                <th className="py-2.5 px-3"><input type="checkbox" className="rounded" /></th>
                <th className="py-2.5 px-3">Reading ID</th>
                <th className="py-2.5 px-3">Source (ID / Location)</th>
                <th className="py-2.5 px-3">Parameter</th>
                <th className="py-2.5 px-3">Value</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Verification Status</th>
                <th className="py-2.5 px-3">Collected At</th>
                <th className="py-2.5 px-3">Received At</th>
                <th className="py-2.5 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => (
                <tr key={r.readingId} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-3"><input type="checkbox" className="rounded" /></td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{r.readingId}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{r.source}</td>
                  <td className="py-2.5 px-3 text-slate-700">{r.parameter}</td>
                  <td className={`py-2.5 px-3 font-bold ${r.anomaly ? 'text-rose-600' : 'text-slate-800'}`}>{r.value}</td>
                  <td className="py-2.5 px-3 text-slate-500">{r.unit}</td>
                  <td className="py-2.5 px-3 text-slate-600">{r.method}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${VERIFICATION_STYLES[r.verificationStatus]}`}>
                      {r.verificationStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{r.collectedAt}</td>
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{r.receivedAt}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
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
          <span className="text-[11px] text-slate-500">Showing 1 – 5 of 2,846 readings</span>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
            {[1,2,3,4,5].map(n => (
              <button key={n} className={`w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center ${n===1?'bg-blue-600 text-white':'text-slate-500 hover:bg-slate-100'}`}>{n}</button>
            ))}
            <span className="text-slate-400 text-xs px-1">…</span>
            <button className="w-9 h-7 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-100 flex items-center justify-center">570</button>
            <button className="p-1 rounded text-slate-400"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};
