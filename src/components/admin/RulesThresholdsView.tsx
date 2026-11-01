import { useState } from 'react';
import type { FC } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Droplet,
  Edit,
  ExternalLink,
  Eye,
  Layers,
  MoreHorizontal,
  PauseCircle,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Tag,
  Target,
} from 'lucide-react';

interface RuleItem {
  ruleId: string;
  parameter: string;
  condition: string;
  threshold: string;
  unit: string;
  severity: 'Critical' | 'High' | 'Warning' | 'Info';
  version: string;
  status: 'Active' | 'Draft' | 'Inactive';
  effectiveFrom: string;
  publicWording: string;
  history: { version: string; desc: string; date: string }[];
}

const RULES: RuleItem[] = [
  {
    ruleId: 'R-PH-001',
    parameter: 'pH',
    condition: '< 6.5',
    threshold: '6.5',
    unit: '-',
    severity: 'Critical',
    version: 'v1.3',
    status: 'Active',
    effectiveFrom: '24 Oct 2026',
    publicWording: 'pH below 6.5 indicates potential acidity issues. Further testing may be required.',
    history: [
      { version: 'v1.3', desc: 'Updated threshold (6.5)', date: '24 Oct 2026' },
      { version: 'v1.2', desc: 'Initial rule calibration', date: '10 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-PH-002',
    parameter: 'pH',
    condition: '> 8.5',
    threshold: '8.5',
    unit: '-',
    severity: 'Critical',
    version: 'v1.3',
    status: 'Active',
    effectiveFrom: '24 Oct 2026',
    publicWording: 'pH above 8.5 indicates alkaline condition exceeding drinking water limits.',
    history: [
      { version: 'v1.3', desc: 'Aligned with IS 10500:2012 permissible threshold', date: '24 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-TDS-001',
    parameter: 'TDS',
    condition: '> 1,000',
    threshold: '1,000',
    unit: 'mg/L',
    severity: 'High',
    version: 'v1.3',
    status: 'Active',
    effectiveFrom: '24 Oct 2026',
    publicWording: 'Total Dissolved Solids exceed desirable standard (500 mg/L) reaching high threshold.',
    history: [
      { version: 'v1.3', desc: 'Refined permissible bound', date: '24 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-TUR-001',
    parameter: 'Turbidity',
    condition: '> 5.0',
    threshold: '5.0',
    unit: 'NTU',
    severity: 'Warning',
    version: 'v1.2',
    status: 'Active',
    effectiveFrom: '15 Oct 2026',
    publicWording: 'Turbidity exceeding 5.0 NTU impacts optical clarity and disinfection efficacy.',
    history: [
      { version: 'v1.2', desc: 'Adjusted seasonal rainy season factor', date: '15 Oct 2026' },
    ],
  },
  {
    ruleId: 'R-BAC-001',
    parameter: 'Bacteria',
    condition: 'Detected',
    threshold: '-',
    unit: '-',
    severity: 'Critical',
    version: 'v1.3',
    status: 'Active',
    effectiveFrom: '24 Oct 2026',
    publicWording: 'Coliform / microbial presence detected. Unsafe for direct ingestion without boiling.',
    history: [
      { version: 'v1.3', desc: 'Instant critical alert trigger established', date: '24 Oct 2026' },
    ],
  },
];

const SEVERITY_BADGES: Record<string, string> = {
  Critical: 'bg-rose-600 text-white',
  High: 'bg-orange-500 text-white',
  Warning: 'bg-amber-400 text-amber-950',
  Info: 'bg-blue-100 text-blue-700',
};

export const RulesThresholdsView: FC = () => {
  const [activeTab, setActiveTab] = useState<'rules' | 'standards'>('rules');
  const [selectedId, setSelectedId] = useState('R-PH-001');
  const [search, setSearch] = useState('');
  const [paramFilter, setParamFilter] = useState('All Parameters');
  const [severityFilter, setSeverityFilter] = useState('All Severities');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [versionFilter, setVersionFilter] = useState('All Versions');
  const [publicWordingEnabled, setPublicWordingEnabled] = useState(true);

  const selected = RULES.find(r => r.ruleId === selectedId) ?? RULES[0];

  const filtered = RULES.filter(rule => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      rule.ruleId.toLowerCase().includes(q) ||
      rule.parameter.toLowerCase().includes(q) ||
      rule.publicWording.toLowerCase().includes(q);
    const matchParam = paramFilter === 'All Parameters' || rule.parameter === paramFilter;
    const matchSev = severityFilter === 'All Severities' || rule.severity === severityFilter;
    const matchStatus = statusFilter === 'All Statuses' || rule.status === statusFilter;
    const matchVer = versionFilter === 'All Versions' || rule.version === versionFilter;
    return matchSearch && matchParam && matchSev && matchStatus && matchVer;
  });

  return (
    <div className="space-y-4 font-sans">
      {/* ── KPI CARDS (Matching Screenshot 2) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            icon: <Settings className="w-5 h-5" />,
            bg: 'bg-blue-50',
            iconBg: 'bg-blue-100 text-blue-600',
            label: 'Total Rules',
            value: '12',
            sub: '▲ +2',
            subClr: 'text-emerald-600',
            desc: '(Active + Draft)',
          },
          {
            icon: <CheckCircle2 className="w-5 h-5 fill-current" />,
            bg: 'bg-emerald-50',
            iconBg: 'bg-emerald-100 text-emerald-600',
            label: 'Active Rules',
            value: '9',
            sub: '(75.0%)',
            subClr: 'text-emerald-700',
            desc: '',
          },
          {
            icon: <Layers className="w-5 h-5" />,
            bg: 'bg-sky-50',
            iconBg: 'bg-sky-100 text-sky-600',
            label: 'Parameters Covered',
            value: '5',
            sub: '',
            subClr: '',
            desc: 'pH, TDS, Turbidity, Bacteria, Nitrate',
          },
          {
            icon: <Tag className="w-5 h-5" />,
            bg: 'bg-amber-50',
            iconBg: 'bg-amber-100 text-amber-600',
            label: 'Current Rule Version',
            value: 'v1.3',
            sub: '',
            subClr: '',
            desc: 'Published: 24 Oct 2026',
          },
          {
            icon: <Clock className="w-5 h-5" />,
            bg: 'bg-slate-50',
            iconBg: 'bg-slate-100 text-slate-500',
            label: 'Last Updated',
            value: '01 Nov 2026',
            sub: '10:24 AM',
            subClr: 'text-slate-500',
            desc: 'by Admin User',
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
                  <span className="text-xl font-black text-slate-900">{c.value}</span>
                  {c.sub && <span className={`text-[11px] font-bold ${c.subClr}`}>{c.sub}</span>}
                </div>
                {c.desc && <div className="text-[10px] text-slate-500 leading-tight">{c.desc}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TABS: Rules (12) & Threshold Standards ── */}
      <div className="flex border-b border-slate-200 gap-1">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'rules'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Rules (12)
        </button>
        <button
          onClick={() => setActiveTab('standards')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'standards'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Threshold Standards
        </button>
      </div>

      {/* ── FILTERS ── */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Rule ID, Parameter, or Description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-72 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          />
        </div>
        {[
          {
            label: 'Parameter',
            val: paramFilter,
            set: setParamFilter,
            opts: ['All Parameters', 'pH', 'TDS', 'Turbidity', 'Bacteria'],
          },
          {
            label: 'Severity',
            val: severityFilter,
            set: setSeverityFilter,
            opts: ['All Severities', 'Critical', 'High', 'Warning'],
          },
          {
            label: 'Status',
            val: statusFilter,
            set: setStatusFilter,
            opts: ['All Statuses', 'Active', 'Draft', 'Inactive'],
          },
          {
            label: 'Rule Version',
            val: versionFilter,
            set: setVersionFilter,
            opts: ['All Versions', 'v1.3', 'v1.2', 'v1.1'],
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
        <button
          onClick={() => {
            setSearch('');
            setParamFilter('All Parameters');
            setSeverityFilter('All Severities');
            setStatusFilter('All Statuses');
            setVersionFilter('All Versions');
          }}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 mt-4 ml-1"
        >
          Clear
        </button>
        <button className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg mt-4 transition ml-auto">
          <Plus className="w-3.5 h-3.5" /> Add Rule
        </button>
      </div>

      {/* ── TWO-COLUMN VIEW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Rules Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Rules ({filtered.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 text-[11px] font-semibold">
                  <th className="py-2.5 px-3">Rule ID</th>
                  <th className="py-2.5 px-3">Parameter</th>
                  <th className="py-2.5 px-3">Condition</th>
                  <th className="py-2.5 px-3">Threshold</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(rule => (
                  <tr
                    key={rule.ruleId}
                    onClick={() => setSelectedId(rule.ruleId)}
                    className={`cursor-pointer transition ${
                      selectedId === rule.ruleId ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{rule.ruleId}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{rule.parameter}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-600">{rule.condition}</td>
                    <td className="py-2.5 px-3 font-bold text-rose-600">{rule.threshold}</td>
                    <td className="py-2.5 px-3 text-slate-500">{rule.unit}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${SEVERITY_BADGES[rule.severity]}`}>
                        {rule.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{rule.version}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {rule.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                          <MoreHorizontal className="w-3.5 h-3.5" />
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
            <span className="text-[11px] text-slate-500">Showing 1 – {filtered.length} of 12 rules</span>
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
              <button className="p-1 rounded text-slate-400 hover:text-slate-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Rule Details Panel */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Rule Details: {selected.ruleId}</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              {selected.status}
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1">
            {/* Meta Grid (Matching screenshot 2) */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div className="flex items-start gap-2 text-slate-600">
                <Droplet className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Parameter</div>
                  <div className="font-bold text-slate-800">{selected.parameter}</div>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-600">
                <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Severity</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${SEVERITY_BADGES[selected.severity]}`}>
                    {selected.severity}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-600">
                <span className="text-sm font-bold text-slate-400 mt-0.5 shrink-0 font-mono">Σ</span>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Condition</div>
                  <div className="font-medium text-slate-800">{selected.condition}</div>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-600">
                <Layers className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Version</div>
                  <div className="font-medium text-slate-800">{selected.version}</div>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-600">
                <Target className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Threshold</div>
                  <div className="font-bold text-rose-600">{selected.threshold}</div>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Effective From</div>
                  <div className="font-medium text-slate-800">{selected.effectiveFrom}</div>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-600">
                <Edit className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Unit</div>
                  <div className="font-medium text-slate-800">{selected.unit}</div>
                </div>
              </div>
            </div>

            {/* Public Wording Toggle & Text */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[11px] font-bold text-slate-800">Public Wording</div>
                <button
                  type="button"
                  onClick={() => setPublicWordingEnabled(!publicWordingEnabled)}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                    publicWordingEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                      publicWordingEnabled ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                {selected.publicWording}
              </p>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2 flex-wrap bg-slate-50/50 rounded-b-2xl">
            <button className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition shadow-xs">
              <Edit className="w-3.5 h-3.5" /> Edit Rule
            </button>
            <button className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg transition bg-white shadow-xs">
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </button>
            <button className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-100 text-rose-700 px-3 py-1.5 rounded-lg transition bg-white shadow-xs">
              <PauseCircle className="w-3.5 h-3.5 text-rose-600" /> Disable
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM TWO CARDS (Matching Screenshot 2) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Standard Reference */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Standard Reference</div>
              <div className="text-xs text-slate-700 font-medium">Standard: IS 10500:2012 (Drinking Water Specification)</div>
              <div className="text-[11px] text-slate-500">Edition: Second Revision &nbsp;|&nbsp; Used for: pH, TDS, Turbidity</div>
            </div>
          </div>
          <button className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition shrink-0 ml-3">
            <span>View Standard</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Card 2: Version History */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Version History ({selected.ruleId})</div>
              <div className="space-y-0.5 mt-0.5">
                {selected.history.map((h, i) => (
                  <div key={i} className="text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-800">• {h.version}</span> – {h.desc}, {h.date}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition shrink-0 ml-3">
            <span>View Full History</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
