import { useMemo, useState } from 'react';
import type { FC } from 'react';
import type { Source } from '../../types/water';
import { MapExplorer } from '../MapExplorer';
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Droplet, Eye, FlaskConical, MapPin, MoreHorizontal,
  Plus, Search,
} from 'lucide-react';

interface SourceRow {
  sourceId: string;
  name: string;
  type: string;
  typeIcon: string;
  location: string;
  status: 'Active' | 'Under Review' | 'Inactive';
  lastReading: string;
  lat: number;
  lng: number;
  latestPh?: string;
  turbidity?: string;
  verification?: string;
}

const SOURCES: SourceRow[] = [
  { sourceId: 'A-04', name: 'Hand Pump 001',       type: 'Hand Pump',    typeIcon: '🧲', location: 'Jhansi',   status: 'Active',       lastReading: '01 Nov 2026,\n07:40 PM', lat: 25.453, lng: 78.575, latestPh: '9.4',  turbidity: '3.1 NTU', verification: 'Screening' },
  { sourceId: 'B-02', name: 'Borewell – Orchha',   type: 'Borewell',     typeIcon: '🔩', location: 'Orchha',   status: 'Active',       lastReading: '01 Nov 2026,\n06:28 PM', lat: 25.486, lng: 78.541, latestPh: '7.2',  turbidity: '1.8 NTU', verification: 'Screening' },
  { sourceId: 'C-01', name: 'River Intake – Datia', type: 'Surface Water', typeIcon: '🌊', location: 'Datia',    status: 'Active',       lastReading: '01 Nov 2026,\n05:55 PM', lat: 25.499, lng: 78.591, latestPh: '7.8',  turbidity: '2.4 NTU', verification: 'Lab Verified' },
  { sourceId: 'D-03', name: 'Community Tap',        type: 'Tap / Pipeline',typeIcon:'🚰', location: 'Lalitpur', status: 'Active',       lastReading: '01 Nov 2026,\n05:10 PM', lat: 25.426, lng: 78.521, latestPh: '6.3',  turbidity: '0.9 NTU', verification: 'Screening' },
  { sourceId: 'E-05', name: 'Hand Pump 005',        type: 'Hand Pump',    typeIcon: '🧲', location: 'Jhansi',   status: 'Under Review', lastReading: '01 Nov 2026,\n03:45 PM', lat: 25.411, lng: 78.621, latestPh: '8.6',  turbidity: '5.2 NTU', verification: 'Screening' },
];

const STATUS_STYLES: Record<string, string> = {
  'Active':       'bg-emerald-100 text-emerald-700',
  'Under Review': 'bg-amber-100 text-amber-800',
  'Inactive':     'bg-slate-100 text-slate-500',
};

export const WaterSourcesView: FC<{ sources?: Source[] }> = ({ sources = [] }) => {
  const [selectedId, setSelectedId] = useState('A-04');
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');

  const selected = SOURCES.find(s => s.sourceId === selectedId) ?? SOURCES[0];

  // The demo sources in the table, as highlighted pins on the shared map.
  const highlightSources = useMemo(() => SOURCES.map(s => ({
    sourceId: s.sourceId,
    name: s.name,
    latitude: s.lat,
    longitude: s.lng,
    tone: (s.status === 'Active' ? 'ok' : s.status === 'Under Review' ? 'warn' : 'off') as 'ok' | 'warn' | 'off',
  })), []);

  const filtered = SOURCES.filter(s => {
    const q = search.toLowerCase();
    return (
      (!q || s.sourceId.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q)) &&
      (typeFilter === 'All Types' || s.type === typeFilter) &&
      (statusFilter === 'All Status' || s.status === statusFilter)
    );
  });

  return (
    <div className="space-y-4 font-sans">
      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { icon: <MapPin className="w-5 h-5"/>,        bg: 'bg-blue-50',    iconBg: 'bg-blue-100 text-blue-600',    label: 'Total Sources',          value: '148', sub: '▲ +3', subC: 'text-emerald-600', desc: 'Registered sources' },
          { icon: <CheckCircle2 className="w-5 h-5"/>,  bg: 'bg-emerald-50', iconBg: 'bg-emerald-100 text-emerald-600',label:'Active Sources',          value: '142', sub: '(96.0%)', subC: 'text-emerald-600', desc: '' },
          { icon: <FlaskConical className="w-5 h-5"/>,  bg: 'bg-amber-50',   iconBg: 'bg-amber-100 text-amber-600',  label: 'With Recent Reading',    value: '118', sub: '(79.7%)', subC: 'text-amber-700', desc: '' },
          { icon: <AlertTriangle className="w-5 h-5"/>, bg: 'bg-rose-50',    iconBg: 'bg-rose-100 text-rose-600',    label: 'Sources with Alert',     value: '7',   sub: '(4.7%)',  subC: 'text-rose-600', desc: '' },
          { icon: <Clock className="w-5 h-5"/>,         bg: 'bg-slate-50',   iconBg: 'bg-slate-100 text-slate-500',  label: 'Stale / No Reading',     value: '23',  sub: '(15.5%)',subC: 'text-slate-500', desc: '' },
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
          <input type="text" placeholder="Search by Source ID, Name, or Location…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
        </div>
        {[
          { label: 'Source Type', val: typeFilter,   set: setTypeFilter,   opts: ['All Types','Hand Pump','Borewell','Surface Water','Tap / Pipeline'] },
          { label: 'Status',      val: statusFilter, set: setStatusFilter, opts: ['All Status','Active','Under Review','Inactive'] },
          { label: 'District / Locality', val: 'All Districts', set: () => {}, opts: ['All Districts','Jhansi','Orchha','Datia','Lalitpur'] },
        ].map(f => (
          <div key={f.label} className="flex flex-col">
            <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">{f.label}</span>
            <select value={f.val} onChange={e => f.set(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer">
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 mt-4">Clear</button>
        <button className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg mt-4 transition">
          <Plus className="w-3.5 h-3.5" /> Add Water Source
        </button>
      </div>

      {/* ── TWO-COLUMN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Sources Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <Droplet className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Water Sources ({filtered.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 text-[11px] font-semibold">
                  <th className="py-2.5 px-3">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="py-2.5 px-3">Source ID</th>
                  <th className="py-2.5 px-3">Source Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Location (District)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Last Reading</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => (
                  <tr key={s.sourceId} onClick={() => setSelectedId(s.sourceId)}
                    className={`cursor-pointer transition ${selectedId === s.sourceId ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}>
                    <td className="py-2.5 px-3"><input type="checkbox" className="rounded" onClick={e => e.stopPropagation()} /></td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{s.sourceId}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{s.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.typeIcon} {s.type}</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.location}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[s.status]}`}>{s.status}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-pre-line text-[11px]">{s.lastReading}</td>
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
            <span className="text-[11px] text-slate-500">Showing 1 – 5 of 148 sources</span>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
              {[1,2,3,4,5].map(n => (
                <button key={n} className={`w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center ${n === 1 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{n}</button>
              ))}
              <span className="text-slate-400 text-xs px-1">…</span>
              <button className="w-7 h-7 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-100 flex items-center justify-center">30</button>
              <button className="p-1 rounded text-slate-400"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* RIGHT: Map + Selected Source Card */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Selected Source Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Selected Source: {selected.sourceId}
              </span>
              <button className="text-[11px] font-semibold text-blue-600 hover:underline">View Details →</button>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-lg">
                {selected.typeIcon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{selected.name}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[selected.status]}`}>{selected.status}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{selected.location}, Uttar Pradesh</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 text-[10px]">
              <div>
                <div className="text-slate-400 flex items-center gap-1"><Droplet className="w-3 h-3" /> Last Reading</div>
                <div className="font-semibold text-slate-800 mt-0.5">{selected.lastReading.replace('\n', ' ')}</div>
              </div>
              <div>
                <div className="text-slate-400">Latest pH</div>
                <div className="font-bold text-rose-600 text-base mt-0.5">{selected.latestPh}</div>
              </div>
              <div>
                <div className="text-slate-400">Turbidity</div>
                <div className="font-semibold text-slate-800 mt-0.5">{selected.turbidity}</div>
              </div>
              <div>
                <div className="text-slate-400">Verification</div>
                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${selected.verification === 'Lab Verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                  {selected.verification}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAP: the same keyless Esri/GIS map the citizen page uses (GMC wards + live sources) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 pb-3">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-bold text-slate-900">Water Sources Map</span>
          <span className="text-[11px] text-slate-500">Highlighted pins are the {SOURCES.length} sources in the table above; click one to select it.</span>
        </div>
        <MapExplorer
          sources={sources}
          showStationCard={false}
          highlightSources={highlightSources}
          selectedHighlightId={selectedId}
          onSelectHighlight={setSelectedId}
          fitHighlights
        />
      </div>
    </div>
  );
};
