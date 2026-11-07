import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import {
  FlaskConical,
  Award,
  CheckCircle2,
  FileCheck,
  Microscope,
  Thermometer,
  Scale,
  Check,
  X,
  Upload,
  ShieldCheck
} from 'lucide-react';
import type { Source } from '../../types/water';
import LabReportsEvidenceView from '../../components/evidence/LabReportsEvidenceView';

interface LabSampleQueueItem {
  id: string;
  sourceId: string;
  sourceName: string;
  collectedBy: string;
  collectedAt: string;
  parameters: {
    tds: number;
    fluoride: number;
    turbidity: number;
    nitrate: number;
    ecoli: number;
  };
  status: 'PENDING_REVIEW' | 'LAB_VERIFIED' | 'REJECTED_ANOMALY';
  verdict: string;
}

export const LabReportsPanel: FC<{
  sources: Source[];
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}> = ({ sources, busy, onSubmit }) => {
  const [samplesQueue, setSamplesQueue] = useState<LabSampleQueueItem[]>([
    {
      id: 'GWL-LAB-891',
      sourceId: 'source-gwl-014',
      sourceName: 'Maharaj Bada Hand Pump #04 (Ward 14)',
      collectedBy: 'R. Sharma (Field Unit #04)',
      collectedAt: 'Today, 07:30 UTC',
      parameters: {
        tds: 620,
        fluoride: 1.24,
        turbidity: 0.85,
        nitrate: 18.0,
        ecoli: 0,
      },
      status: 'PENDING_REVIEW',
      verdict: 'TDS elevated (620 mg/L) above 500 mg/L baseline',
    },
    {
      id: 'GWL-LAB-892',
      sourceId: 'source-gwl-003',
      sourceName: 'Tigra Reservoir Water Works (Thatipur)',
      collectedBy: 'Automated Continuous Sampler #02',
      collectedAt: 'Today, 05:30 UTC',
      parameters: {
        tds: 260,
        fluoride: 0.65,
        turbidity: 0.45,
        nitrate: 14.1,
        ecoli: 0,
      },
      status: 'LAB_VERIFIED',
      verdict: 'Optimal Potable Specification (All BIS IS 10500 limits met)',
    },
    {
      id: 'GWL-LAB-893',
      sourceId: 'source-gwl-007',
      sourceName: 'Laxmi Ganj Borewell (Zone 03)',
      collectedBy: 'P. Verma (Surveillance Chemist)',
      collectedAt: 'Yesterday, 14:15 UTC',
      parameters: {
        tds: 410,
        fluoride: 0.85,
        turbidity: 0.65,
        nitrate: 28.0,
        ecoli: 0,
      },
      status: 'LAB_VERIFIED',
      verdict: 'Potable Standard Verified with NABL Certificate',
    },
  ]);

  const [notification, setNotification] = useState<string | null>(null);
  const [selectedSourceForUpload, setSelectedSourceForUpload] = useState<string>(
    sources.length ? sources[0].sourceId : 'source-gwl-014'
  );

  const handleVerify = (sampleId: string, isApproved: boolean) => {
    setSamplesQueue(prev =>
      prev.map(s => {
        if (s.id === sampleId) {
          return {
            ...s,
            status: isApproved ? 'LAB_VERIFIED' : 'REJECTED_ANOMALY',
          };
        }
        return s;
      })
    );
    setNotification(
      isApproved
        ? `Sample ${sampleId} verified and issued NABL Accreditation Certificate`
        : `Sample ${sampleId} flagged as chemical anomaly for re-testing`
    );
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6 font-sans text-left">
      {/* 1. LABORATORY COMMAND HEADER FROM CC-PROJECT */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-[#040C1A] border border-purple-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <FlaskConical className="w-5 h-5 text-purple-400" />
              </span>
              <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">
                Central Water Analytical Testing Laboratory &bull; ISO/IEC 17025:2017
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Laboratory Chemist &amp; Certification Console
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Senior Chemist: <strong>Dr. S. Mukherjee</strong> (NABL Cert #
              <code className="bg-slate-950 px-1.5 py-0.5 rounded text-purple-300 font-mono text-xs">
                TC-8491
              </code>
              ). Spectroscopic batch certification, heavy metal assays, microbiological cultures, and statutory compliance verification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <span className="px-4 py-2 rounded-xl bg-purple-950/80 border border-purple-700/50 text-purple-300 font-mono text-xs font-bold flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>NABL ISO 17025 Active</span>
            </span>
          </div>
        </div>

        {/* Live Lab Equipment Telemetry Strip */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center space-x-2.5">
            <Microscope className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">UV-VIS Spectrophotometer</div>
              <div className="font-bold text-purple-300 text-[11px]">Calibrated (540nm)</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center space-x-2.5">
            <Thermometer className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">Microbial Incubator</div>
              <div className="font-bold text-emerald-400 text-[11px]">37.0°C &bull; Optimal</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center space-x-2.5">
            <Scale className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">Analytical Balance</div>
              <div className="font-bold text-cyan-300 text-[11px]">±0.0001g Precision</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center space-x-2.5">
            <Award className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">NABL Accreditation</div>
              <div className="font-bold text-amber-300 text-[11px]">ISO/IEC 17025 Valid</div>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-purple-950/90 border border-purple-600/50 text-purple-200 text-xs font-mono font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* 2. PENDING SAMPLE VERIFICATION QUEUE & STATUTORY LIMITS (CC-PROJECT LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Certification Queue */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse"></span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Sample Certification &amp; Approval Queue ({samplesQueue.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Chain of Custody Verified</span>
          </div>

          <div className="space-y-3">
            {samplesQueue.map(sample => (
              <div
                key={sample.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950 text-purple-300 border border-purple-800">
                        {sample.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          sample.status === 'LAB_VERIFIED'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : sample.status === 'REJECTED_ANOMALY'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {sample.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-white pt-1">{sample.sourceName}</h4>
                    <p className="text-xs text-slate-400">
                      Collector: {sample.collectedBy} &bull; {sample.collectedAt}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 block">
                      {sample.verdict}
                    </span>
                  </div>
                </div>

                {/* Laboratory Parameters Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-xs">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">TDS (Gravimetric)</div>
                    <div
                      className={`font-bold mt-0.5 ${
                        sample.parameters.tds > 500 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {sample.parameters.tds} mg/L
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Fluoride (SPADNS)</div>
                    <div
                      className={`font-bold mt-0.5 ${
                        sample.parameters.fluoride > 1.0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {sample.parameters.fluoride} mg/L
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Turbidity (Nephelo)</div>
                    <div className="font-bold text-emerald-400 mt-0.5">
                      {sample.parameters.turbidity} NTU
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Nitrate (NO3)</div>
                    <div className="font-bold text-emerald-400 mt-0.5">
                      {sample.parameters.nitrate} mg/L
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">E. Coli (MPN)</div>
                    <div className="font-bold text-emerald-400 mt-0.5">
                      {sample.parameters.ecoli} CFU/100ml
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                {sample.status === 'PENDING_REVIEW' && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => handleVerify(sample.id, false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 text-xs font-bold transition flex items-center space-x-1 border border-slate-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 text-rose-400" />
                      <span>Flag Anomaly</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerify(sample.id, true)}
                      className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow flex items-center space-x-1.5 cursor-pointer border-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve &amp; Issue NABL Cert</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (4 cols): BIS IS 10500 Chemical Tolerance Matrix */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5 shadow-xl">
            <div className="border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Statutory BIS IS 10500 Limits
              </h3>
              <p className="text-[11px] text-slate-400">
                Central Ground Water Board (CGWB) &amp; NABL Norms
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-200">Fluoride (as F)</div>
                  <div className="text-[10px] text-slate-500">Max Permissible: 1.5 mg/L</div>
                </div>
                <span className="font-mono text-cyan-400 font-bold">&lt; 1.0 mg/L</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-200">Nitrate (as NO3)</div>
                  <div className="text-[10px] text-slate-500">Max Acceptable: 45 mg/L</div>
                </div>
                <span className="font-mono text-emerald-400 font-bold">&lt; 45 mg/L</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-200">Total Dissolved Solids</div>
                  <div className="text-[10px] text-slate-500">Max Permissible: 2000 mg/L</div>
                </div>
                <span className="font-mono text-amber-400 font-bold">&lt; 500 mg/L</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-200">Nephelometric Turbidity</div>
                  <div className="text-[10px] text-slate-500">Max Permissible: 5.0 NTU</div>
                </div>
                <span className="font-mono text-cyan-400 font-bold">&lt; 1.0 NTU</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-200">Free Residual Chlorine</div>
                  <div className="text-[10px] text-slate-500">Mandatory at Consumer Tap</div>
                </div>
                <span className="font-mono text-emerald-400 font-bold">0.2–1.0 mg/L</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DIGITAL EVIDENCE UPLOAD & PREVIEW SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        <div className="lg:col-span-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
              <Upload className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="font-bold text-white text-sm">Upload Laboratory Certificate (.pdf)</h3>
                <p className="text-xs text-slate-400">Direct encrypted multipart upload into municipal digital archive</p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Water Monitoring Point</label>
                <select
                  name="sourceId"
                  value={selectedSourceForUpload}
                  onChange={e => setSelectedSourceForUpload(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-purple-500"
                  required
                >
                  {sources.map(s => (
                    <option key={s.sourceId} value={s.sourceId}>
                      {s.sourceId} &bull; {s.name || s.sourceId} ({s.locality || s.district || 'Gwalior'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Accredited Laboratory Certificate (PDF)</label>
                <input
                  type="file"
                  name="report"
                  accept="application/pdf,.pdf"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-300 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Requests a 300s presigned upload URL. File is scanned and tagged with SHA-256 cryptographic hash for chain-of-custody compliance.
              </p>

              <button
                type="submit"
                disabled={busy || !sources.length}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/20 cursor-pointer border-0 disabled:opacity-50"
              >
                <FileCheck className="w-4 h-4" />
                <span>{busy ? 'Uploading Document...' : 'Upload Document &amp; Generate Key →'}</span>
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-6">
          <LabReportsEvidenceView
            sourceId={selectedSourceForUpload}
            wardNumber={parseInt(selectedSourceForUpload.replace(/\D/g, ''), 10) || 14}
            isStaff={true}
          />
        </div>
      </div>
    </div>
  );
};

export default LabReportsPanel;
