import { useState } from 'react';
import type { FC } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileCheck,
  FileText,
  Folder,
  Image as ImageIcon,
  Layers,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  Search,
  Upload,
  User,
  X,
} from 'lucide-react';
import type { Source } from '../../types/water';

interface EvidenceFile {
  id: string;
  fileName: string;
  type: 'Lab Report' | 'Field Photo' | 'Field Sheet' | 'Other';
  linkedTo: string;
  source: string;
  sourceLocation: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  previewUrl?: string;
  parameters?: { name: string; result: string; unit: string; alert?: boolean }[];
  verifiedBy?: string;
}

const EVIDENCE_DATA: EvidenceFile[] = [
  {
    id: 'EV-001',
    fileName: 'lab_report_A04_20261101.pdf',
    type: 'Lab Report',
    linkedTo: 'ALT-2026-0158',
    source: 'A-04',
    sourceLocation: 'A-04 (Jhansi)',
    uploadedBy: 'Meera S.',
    uploadedAt: '01 Nov 2026, 07:58 PM',
    size: '1.2 MB',
    parameters: [
      { name: 'pH', result: '9.4', unit: '-', alert: true },
      { name: 'Turbidity', result: '3.1', unit: 'NTU' },
      { name: 'TDS', result: '820', unit: 'mg/L' },
      { name: 'Bacteria', result: 'Detected', unit: '-', alert: true },
    ],
    verifiedBy: 'Dr. R. Sharma, Chief Analyst',
  },
  {
    id: 'EV-002',
    fileName: 'field_photo_A04_1.jpg',
    type: 'Field Photo',
    linkedTo: 'ALT-2026-0158',
    source: 'A-04',
    sourceLocation: 'A-04 (Jhansi)',
    uploadedBy: 'Meera S.',
    uploadedAt: '01 Nov 2026, 07:55 PM',
    size: '3.8 MB',
    previewUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f3?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'EV-003',
    fileName: 'field_photo_A04_2.jpg',
    type: 'Field Photo',
    linkedTo: 'ALT-2026-0158',
    source: 'A-04',
    sourceLocation: 'A-04 (Jhansi)',
    uploadedBy: 'Meera S.',
    uploadedAt: '01 Nov 2026, 07:55 PM',
    size: '3.4 MB',
    previewUrl: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'EV-004',
    fileName: 'field_sheet_A04.pdf',
    type: 'Field Sheet',
    linkedTo: 'RD-2026-03124',
    source: 'A-04',
    sourceLocation: 'A-04 (Jhansi)',
    uploadedBy: 'Rohit K.',
    uploadedAt: '01 Nov 2026, 07:43 PM',
    size: '428 KB',
    parameters: [
      { name: 'Field pH', result: '9.35', unit: '-' },
      { name: 'Temperature', result: '24.2', unit: '°C' },
      { name: 'Dissolved O2', result: '6.8', unit: 'mg/L' },
    ],
    verifiedBy: 'Field Officer Rohit K.',
  },
  {
    id: 'EV-005',
    fileName: 'lab_report_C01_TDS.pdf',
    type: 'Lab Report',
    linkedTo: 'ALT-2026-0156',
    source: 'C-01',
    sourceLocation: 'C-01 (Datia)',
    uploadedBy: 'Anita P.',
    uploadedAt: '01 Nov 2026, 05:28 PM',
    size: '1.5 MB',
    parameters: [
      { name: 'TDS', result: '1,240', unit: 'mg/L', alert: true },
      { name: 'Conductivity', result: '1,890', unit: 'µS/cm' },
      { name: 'Chloride', result: '310', unit: 'mg/L' },
    ],
    verifiedBy: 'Anita Patel, Lab Chemist',
  },
];

const TYPE_STYLES: Record<string, string> = {
  'Lab Report': 'bg-blue-100 text-blue-700 border-blue-200',
  'Field Photo': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Field Sheet': 'bg-amber-100 text-amber-800 border-amber-200',
  'Other': 'bg-purple-100 text-purple-700 border-purple-200',
};

interface EvidenceS3ViewProps {
  sources?: Source[];
  busy?: boolean;
  onUploadReport?: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export const EvidenceS3View: FC<EvidenceS3ViewProps> = ({ sources = [] }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'lab' | 'photos' | 'sheets' | 'other'>('all');
  const [selectedId, setSelectedId] = useState('EV-001');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [alertFilter, setAlertFilter] = useState('All Alerts');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const selected = EVIDENCE_DATA.find(e => e.id === selectedId) ?? EVIDENCE_DATA[0];

  const filtered = EVIDENCE_DATA.filter(item => {
    // Tab filter
    if (activeTab === 'lab' && item.type !== 'Lab Report') return false;
    if (activeTab === 'photos' && item.type !== 'Field Photo') return false;
    if (activeTab === 'sheets' && item.type !== 'Field Sheet') return false;
    if (activeTab === 'other' && item.type !== 'Other') return false;

    // Search filter
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      item.fileName.toLowerCase().includes(q) ||
      item.linkedTo.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      item.uploadedBy.toLowerCase().includes(q);

    // Dropdown filters
    const matchSource = sourceFilter === 'All Sources' || item.source.includes(sourceFilter);
    const matchAlert = alertFilter === 'All Alerts' || item.linkedTo.includes(alertFilter);
    const matchType = typeFilter === 'All Types' || item.type === typeFilter;

    return matchSearch && matchSource && matchAlert && matchType;
  });

  return (
    <div className="space-y-4 font-sans">
      {/* ── 5 KPI METRIC CARDS (Matching Screenshot) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            icon: <Layers className="w-5 h-5" />,
            bg: 'bg-blue-50',
            iconBg: 'bg-blue-100 text-blue-600',
            label: 'Total Files',
            value: '176',
            sub: '▲ +24',
            subClr: 'text-emerald-600',
            desc: '(This month)',
          },
          {
            icon: <FileCheck className="w-5 h-5" />,
            bg: 'bg-emerald-50',
            iconBg: 'bg-emerald-100 text-emerald-600',
            label: 'Lab Reports',
            value: '64',
            sub: '(36.4%)',
            subClr: 'text-emerald-700',
            desc: '',
          },
          {
            icon: <ImageIcon className="w-5 h-5" />,
            bg: 'bg-sky-50',
            iconBg: 'bg-sky-100 text-sky-600',
            label: 'Field Photos',
            value: '72',
            sub: '(40.9%)',
            subClr: 'text-sky-700',
            desc: '',
          },
          {
            icon: <FileText className="w-5 h-5" />,
            bg: 'bg-amber-50',
            iconBg: 'bg-amber-100 text-amber-600',
            label: 'Field Sheets',
            value: '28',
            sub: '(15.9%)',
            subClr: 'text-amber-700',
            desc: '',
          },
          {
            icon: <Paperclip className="w-5 h-5" />,
            bg: 'bg-purple-50',
            iconBg: 'bg-purple-100 text-purple-600',
            label: 'Other Evidence',
            value: '12',
            sub: '(6.8%)',
            subClr: 'text-purple-700',
            desc: '',
          },
        ].map(card => (
          <div key={card.label} className={`${card.bg} border border-slate-100 rounded-2xl p-4 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${card.iconBg} flex items-center justify-center shrink-0`}>
                {card.icon}
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-600">{card.label}</div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-2xl font-black text-slate-900">{card.value}</span>
                  {card.sub && <span className={`text-[11px] font-bold ${card.subClr}`}>{card.sub}</span>}
                </div>
                {card.desc && <div className="text-[10px] text-slate-500">{card.desc}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TABS (All Evidence, Lab Reports, Field Photos, Field Sheets, Other) ── */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        {[
          { id: 'all', label: 'All Evidence (176)', icon: <Folder className="w-3.5 h-3.5" /> },
          { id: 'lab', label: 'Lab Reports (64)', icon: <FileCheck className="w-3.5 h-3.5" /> },
          { id: 'photos', label: 'Field Photos (72)', icon: <ImageIcon className="w-3.5 h-3.5" /> },
          { id: 'sheets', label: 'Field Sheets (28)', icon: <FileText className="w-3.5 h-3.5" /> },
          { id: 'other', label: 'Other (12)', icon: <Paperclip className="w-3.5 h-3.5" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── FILTERS BAR ── */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by File Name, Source ID, Alert ID, or Reading ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-72 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          />
        </div>
        {[
          {
            label: 'Source',
            val: sourceFilter,
            set: setSourceFilter,
            opts: ['All Sources', 'A-04', 'B-02', 'C-01', 'D-03', 'E-05'],
          },
          {
            label: 'Alert / Incident',
            val: alertFilter,
            set: setAlertFilter,
            opts: ['All Alerts', 'ALT-2026-0158', 'ALT-2026-0157', 'ALT-2026-0156', 'RD-2026-03124'],
          },
          {
            label: 'Evidence Type',
            val: typeFilter,
            set: setTypeFilter,
            opts: ['All Types', 'Lab Report', 'Field Photo', 'Field Sheet', 'Other'],
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

        {/* Upload Date */}
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">Upload Date</span>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>01 Oct 2026 – 01 Nov 2026</span>
          </div>
        </div>

        <button
          onClick={() => {
            setSearch('');
            setSourceFilter('All Sources');
            setAlertFilter('All Alerts');
            setTypeFilter('All Types');
          }}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 mt-4 ml-1"
        >
          Clear
        </button>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 text-xs font-bold bg-[#0A1728] hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg mt-4 transition ml-auto shadow-xs"
        >
          <Upload className="w-3.5 h-3.5" /> Upload Evidence
        </button>
      </div>

      {/* ── TWO-COLUMN VIEW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Evidence Files Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <Folder className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Evidence Files ({filtered.length})</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 text-[11px] font-semibold">
                  <th className="py-2.5 px-3">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Linked To</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Uploaded By</th>
                  <th className="py-2.5 px-3">Uploaded At</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(item => {
                  const isPdf = item.fileName.endsWith('.pdf');
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`cursor-pointer transition ${
                        selectedId === item.id ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          className="rounded"
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          {isPdf ? (
                            <div className="w-5 h-5 rounded bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                              <ImageIcon className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <span className="font-mono text-[11px] hover:text-blue-600 transition truncate max-w-[150px]">
                            {item.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            TYPE_STYLES[item.type] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{item.linkedTo}</td>
                      <td className="py-2.5 px-3 text-slate-600">{item.source}</td>
                      <td className="py-2.5 px-3 text-slate-600">{item.uploadedBy}</td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-pre-line text-[11px]">
                        {item.uploadedAt.replace(', ', '\n')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{item.size}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedId(item.id);
                              setPreviewModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="Preview File"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => e.stopPropagation()}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Showing 1 – {filtered.length} of 176 files</span>
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
              <button className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] flex items-center justify-center">
                4
              </button>
              <button className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] flex items-center justify-center">
                5
              </button>
              <span className="text-slate-400 text-xs px-1">...</span>
              <button className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] flex items-center justify-center">
                36
              </button>
              <button className="p-1 rounded text-slate-400 hover:text-slate-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Selected Evidence Details & Interactive Preview Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-slate-900 text-xs font-mono truncate max-w-[220px]">
                {selected.fileName}
              </h3>
            </div>
            <button className="text-slate-400 hover:text-slate-600 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* Visual Document Mockup Preview (Matching Screenshot) */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 shadow-inner">
              {selected.previewUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200">
                  <img
                    src={selected.previewUrl}
                    alt={selected.fileName}
                    className="w-full h-44 object-cover"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] backdrop-blur-xs font-mono">
                    JPG · {selected.size}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="text-center pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-1">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs tracking-tight">Water Quality</h4>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      Laboratory Report
                    </div>
                  </div>

                  {/* Micro parameter table */}
                  {selected.parameters && (
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100 font-semibold text-[10px]">
                          <th className="py-1">Parameter</th>
                          <th className="py-1">Result</th>
                          <th className="py-1">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selected.parameters.map((p, i) => (
                          <tr key={i}>
                            <td className="py-1 text-slate-700">{p.name}</td>
                            <td className={`py-1 font-bold ${p.alert ? 'text-rose-600' : 'text-slate-900'}`}>
                              {p.result}
                            </td>
                            <td className="py-1 text-slate-400 text-[10px]">{p.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Signature & Stamp */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                    <div className="italic">Verified by Lab Director</div>
                    <div className="w-10 h-10 rounded-full border border-blue-400 border-dashed text-blue-600 text-[9px] font-bold flex items-center justify-center uppercase tracking-tight text-center leading-none">
                      LAB CERT
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Fields (Matching Screenshot) */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Evidence Type</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    TYPE_STYLES[selected.type]
                  }`}
                >
                  {selected.type}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Linked Alert</span>
                </div>
                <a href={`#${selected.linkedTo}`} className="font-bold text-blue-600 hover:underline font-mono">
                  {selected.linkedTo}
                </a>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <Folder className="w-3.5 h-3.5" />
                  <span>Source</span>
                </div>
                <span className="font-medium text-slate-800">{selected.sourceLocation}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <User className="w-3.5 h-3.5" />
                  <span>Uploaded By</span>
                </div>
                <span className="font-medium text-slate-800">{selected.uploadedBy}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Uploaded At</span>
                </div>
                <span className="font-medium text-slate-800">{selected.uploadedAt}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <FileText className="w-3.5 h-3.5" />
                  <span>File Size</span>
                </div>
                <span className="font-mono font-medium text-slate-800">{selected.size}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons Footer (Matching Screenshot) */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2 flex-wrap bg-slate-50/50 rounded-b-2xl">
            <button
              onClick={() => setPreviewModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition shadow-xs"
            >
              <Eye className="w-3.5 h-3.5" /> View
            </button>
            <button
              onClick={() => {
                const blob = new Blob([`Evidence document content: ${selected.fileName}`], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = selected.fileName;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg transition bg-white shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg transition bg-white shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Replace
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL: Upload New Evidence (S3) ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Upload Evidence to S3</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Evidence Type</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option>Lab Report (PDF)</option>
                  <option>Field Photo (JPG/PNG)</option>
                  <option>Field Inspection Sheet</option>
                  <option>Chain of Custody Form</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Water Source</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {sources.length > 0 ? (
                    sources.map(s => (
                      <option key={s.sourceId} value={s.sourceId}>
                        {s.sourceId} - {s.name ?? 'Source'} ({s.district ?? s.locality ?? 'Unknown'})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="A-04">A-04 - Hand Pump 001 (Jhansi)</option>
                      <option value="B-02">B-02 - Borewell - Orchha</option>
                      <option value="C-01">C-01 - River Intake - Datia</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">File Attachment</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-5 text-center cursor-pointer transition bg-slate-50/50">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <div className="font-semibold text-slate-700">Click to choose or drag files here</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, JPG up to 25MB</div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Optional Lab Note / Ref</label>
                <input
                  type="text"
                  placeholder="e.g. Lab Specimen Reference #90412"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Evidence successfully uploaded and stored to S3 bucket!');
                  setShowUploadModal(false);
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Upload className="w-3.5 h-3.5" /> Upload to S3
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Full Document Preview ── */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm font-mono">{selected.fileName}</h3>
                  <div className="text-[11px] text-slate-500">
                    {selected.type} · {selected.size} · Uploaded by {selected.uploadedBy}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selected.previewUrl ? (
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <img src={selected.previewUrl} alt={selected.fileName} className="w-full h-80 object-cover" />
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">State Water Quality Laboratory</h4>
                      <p className="text-xs text-slate-500">Certified Test Report · {selected.linkedTo}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      Certified
                    </span>
                  </div>

                  {selected.parameters && (
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100 text-[11px]">
                          <th className="py-1.5">Parameter</th>
                          <th className="py-1.5">Measured Value</th>
                          <th className="py-1.5">Unit</th>
                          <th className="py-1.5">Standard Threshold</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selected.parameters.map((p, idx) => (
                          <tr key={idx}>
                            <td className="py-2 font-medium text-slate-800">{p.name}</td>
                            <td className={`py-2 font-bold ${p.alert ? 'text-rose-600' : 'text-slate-900'}`}>
                              {p.result}
                            </td>
                            <td className="py-2 text-slate-500">{p.unit}</td>
                            <td className="py-2 text-slate-400">IS 10500:2012</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div>Signatory: <span className="font-semibold text-slate-800">{selected.verifiedBy}</span></div>
                    <div className="font-mono text-[11px] text-slate-400">Hash: 8f4a21...c9e2</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([`Evidence document content: ${selected.fileName}`], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = selected.fileName;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" /> Download Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
