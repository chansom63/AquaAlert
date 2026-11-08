import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  UploadCloud,
  FileCheck2,
  FolderArchive,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { useAdminTablesData } from '../hooks/useAdminTablesData';
import UploadDocumentView from '../components/admin/UploadDocumentView';
import ReportsView from '../components/admin/ReportsView';
import { EvidenceS3View } from '../components/admin/EvidenceS3View';
import '../styles/admin-dark.css';

type LabTab = 'upload' | 'registry' | 'evidence' | 'standards';

const LabPortalPage: FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<LabTab>('upload');

  const adminTables = useAdminTablesData(
    activeTab === 'upload' ? 'Upload Document' : activeTab === 'registry' ? 'Reports' : 'Evidence Archive'
  );

  useEffect(() => {
    adminTables.fetchReports(true);
    adminTables.fetchSources(false);
  }, []);

  const totalReports = adminTables.reports.length;
  const verifiedReports = adminTables.reports.filter(
    r => r.verificationStatus === 'LAB_VERIFIED'
  ).length;
  const pendingReports = adminTables.reports.filter(
    r => r.verificationStatus === 'PENDING_REVIEW' || !r.verificationStatus
  ).length;
  const flaggedReports = adminTables.reports.filter(
    r => r.verificationStatus === 'REJECTED_ANOMALY'
  ).length;

  return (
    <div className="admin-root admin-dark min-h-screen bg-[#070e24] text-slate-100 font-sans selection:bg-purple-600 selection:text-white flex flex-col">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP LABORATORY NAVIGATION BAR                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#081230]/95 backdrop-blur-md border-b border-[#1b2b62] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 group cursor-pointer"
            title="Return to AquaAlert Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#081230] rounded-[10px] flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div className="text-left">
              <div className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-2">
                <span>AquaAlert Central Laboratory</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/80">
                  NABL TC-8491
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Water Quality Testing, Analytical Assays &amp; S3 Evidence Archive
              </div>
            </div>
          </button>
        </div>

        {/* Chemist Status & Quick Navigation */}
        <div className="flex items-center gap-2.5 sm:gap-3 text-xs">
          {/* Active Chemist Profile Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0d1f47] border border-[#1e3470]">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="font-semibold text-slate-200">
              {user?.name || user?.email || 'Dr. S. Mukherjee (Analyst)'}
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800/60">
              {user?.role || 'ANALYST'}
            </span>
          </div>

          {/* Citizen Portal Link */}
          <button
            type="button"
            onClick={() => navigate('/user')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b183a] hover:bg-[#122452] text-slate-300 hover:text-white border border-[#1d2f60] transition cursor-pointer text-xs"
          >
            <span>Citizen Portal</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Admin Portal Link (if admin) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-800/60 transition cursor-pointer text-xs"
            >
              <span>Admin Console</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b183a] hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-[#1d2f60] hover:border-rose-800/60 transition cursor-pointer text-xs"
            title="Sign out of laboratory portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. ANALYTICAL SUMMARY STRIP                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#091538] border-b border-[#1b2b62] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Reports */}
          <div className="p-3.5 rounded-xl bg-[#070e26] border border-[#182755] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Total Laboratory Reports</div>
              <div className="text-xl sm:text-2xl font-black text-white">{totalReports}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: NABL Verified */}
          <div className="p-3.5 rounded-xl bg-[#070e26] border border-[#182755] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Certified &bull; Lab Verified</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400">{verifiedReports}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Pending / Flagged */}
          <div className="p-3.5 rounded-xl bg-[#070e26] border border-[#182755] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Pending / Anomalies</div>
              <div className="text-xl sm:text-2xl font-black text-amber-300">
                {pendingReports + flaggedReports}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: S3 Vault Status */}
          <div className="p-3.5 rounded-xl bg-[#070e26] border border-[#182755] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400">S3 Evidence Bucket</div>
              <div className="text-xs font-mono font-bold text-cyan-300 truncate max-w-[140px]">
                waterq-dev-evidence
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">● AES-256 ENCRYPTED</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <FolderArchive className="w-5 h-5" />
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. LABORATORY WORKSPACE TABS                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#081230] border-b border-[#1b2b62] px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto">
          <nav className="flex space-x-2 py-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40'
                  : 'text-slate-300 hover:text-white hover:bg-[#0d1f47]'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload &amp; Certify Lab Report</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('registry')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'registry'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40'
                  : 'text-slate-300 hover:text-white hover:bg-[#0d1f47]'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Certified Reports Registry</span>
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60">
                {totalReports}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('evidence')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'evidence'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40'
                  : 'text-slate-300 hover:text-white hover:bg-[#0d1f47]'
              }`}
            >
              <FolderArchive className="w-4 h-4" />
              <span>Evidence S3 Vault</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('standards')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'standards'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40'
                  : 'text-slate-300 hover:text-white hover:bg-[#0d1f47]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>BIS IS 10500:2012 Standards Reference</span>
            </button>
          </nav>

          <button
            type="button"
            onClick={() => adminTables.fetchReports(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-purple-300 hover:text-white bg-[#0d1f47] hover:bg-[#12285a] border border-[#1e3470] transition cursor-pointer shrink-0 ml-3"
            title="Refresh laboratory records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. ACTIVE WORKSPACE VIEW                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {/* TAB 1: UPLOAD & CERTIFY LAB REPORT */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#0d1f47] to-[#070e24] border border-purple-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Accredited Analytical Testing Desk</span>
                </div>
                <h2 className="text-base font-bold text-white">
                  Upload Certified Lab Evidence &amp; Test Parameters
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl">
                  Submit PDF certificates, NABL certificate numbers, and chemical test values (pH, Turbidity, TDS, Coliform CFU) directly to S3 and DynamoDB with authenticated chemist signatures.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700/60 shrink-0">
                CHEMIST SIGN-OFF: ACTIVE
              </span>
            </div>

            <UploadDocumentView
              sources={adminTables.sources}
              alerts={adminTables.alerts}
              reports={adminTables.reports}
              readings={adminTables.readings}
              loading={adminTables.loadingReports}
              onRefresh={() => adminTables.fetchReports(true)}
            />
          </div>
        )}

        {/* TAB 2: CERTIFIED REPORTS REGISTRY */}
        {activeTab === 'registry' && (
          <div className="space-y-4">
            <ReportsView
              reports={adminTables.reports}
              sources={adminTables.sources}
              alerts={adminTables.alerts}
              loading={adminTables.loadingReports}
              onRefresh={() => adminTables.fetchReports(true)}
              initialTab="registry"
              onUpdateReport={adminTables.updateReport}
              onDeleteReport={adminTables.deleteReport}
            />
          </div>
        )}

        {/* TAB 3: EVIDENCE S3 VAULT */}
        {activeTab === 'evidence' && (
          <div className="space-y-4">
            <EvidenceS3View
              sources={adminTables.sources}
              reports={adminTables.reports}
              alerts={adminTables.alerts}
            />
          </div>
        )}

        {/* TAB 4: QUALITY STANDARDS REFERENCE */}
        {activeTab === 'standards' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-[#091533] border border-[#1e3470] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  BUREAU OF INDIAN STANDARDS &bull; IS 10500:2012
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  NATIONAL REGULATORY BENCHMARK
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">
                Drinking Water Specifications — Permissible &amp; Acceptable Limits
              </h2>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                As per Indian Standard IS 10500:2012 (Second Revision), every drinking water source must be tested and certified against the following physical, chemical, and bacteriological standards. Measurements exceeding acceptable limits must trigger automated municipal alerts.
              </p>
            </div>

            {/* Standards Matrix Table */}
            <div className="overflow-x-auto rounded-2xl border border-[#1e3470] shadow-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0c1c45] text-slate-300 font-bold border-b border-[#1c295c] uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Parameter</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4 text-emerald-300">Acceptable Limit (Max)</th>
                    <th className="py-3 px-4 text-amber-300">Permissible Limit (Absence of Alt. Source)</th>
                    <th className="py-3 px-4">Health &amp; Aesthetic Implication</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#172758] bg-[#070e24] font-mono">
                  <tr className="hover:bg-[#0c1a40] transition">
                    <td className="py-3 px-4 font-bold text-white font-sans">pH Value</td>
                    <td className="py-3 px-4 text-cyan-300">-</td>
                    <td className="py-3 px-4 text-emerald-300 font-bold">6.5 – 8.5</td>
                    <td className="py-3 px-4 text-slate-400">No relaxation</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">Affects mucous membrane, pipe corrosion &amp; disinfection efficacy</td>
                  </tr>
                  <tr className="hover:bg-[#0c1a40] transition">
                    <td className="py-3 px-4 font-bold text-white font-sans">Turbidity</td>
                    <td className="py-3 px-4 text-cyan-300">NTU</td>
                    <td className="py-3 px-4 text-emerald-300 font-bold">1.0</td>
                    <td className="py-3 px-4 text-amber-300 font-bold">5.0</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">Shields pathogens, interferes with chlorine disinfection</td>
                  </tr>
                  <tr className="hover:bg-[#0c1a40] transition">
                    <td className="py-3 px-4 font-bold text-white font-sans">Total Dissolved Solids (TDS)</td>
                    <td className="py-3 px-4 text-cyan-300">mg/L</td>
                    <td className="py-3 px-4 text-emerald-300 font-bold">500</td>
                    <td className="py-3 px-4 text-amber-300 font-bold">2000</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">Palatability reduction, gastrointestinal irritation, scaling</td>
                  </tr>
                  <tr className="hover:bg-[#0c1a40] transition">
                    <td className="py-3 px-4 font-bold text-white font-sans">Total Hardness (as CaCO₃)</td>
                    <td className="py-3 px-4 text-cyan-300">mg/L</td>
                    <td className="py-3 px-4 text-emerald-300 font-bold">200</td>
                    <td className="py-3 px-4 text-amber-300 font-bold">600</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">Soap lathering reduction, incrustation of water supply conduits</td>
                  </tr>
                  <tr className="hover:bg-[#0c1a40] transition">
                    <td className="py-3 px-4 font-bold text-white font-sans">Fluoride (as F)</td>
                    <td className="py-3 px-4 text-cyan-300">mg/L</td>
                    <td className="py-3 px-4 text-emerald-300 font-bold">1.0</td>
                    <td className="py-3 px-4 text-amber-300 font-bold">1.5</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">Dental and skeletal fluorosis, bone brittleness</td>
                  </tr>
                  <tr className="hover:bg-[#0c1a40] transition">
                    <td className="py-3 px-4 font-bold text-white font-sans">Chloride (as Cl)</td>
                    <td className="py-3 px-4 text-cyan-300">mg/L</td>
                    <td className="py-3 px-4 text-emerald-300 font-bold">250</td>
                    <td className="py-3 px-4 text-amber-300 font-bold">1000</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">Salty taste, corrosive to metallic plumbing</td>
                  </tr>
                  <tr className="hover:bg-[#0c1a40] transition">
                    <td className="py-3 px-4 font-bold text-white font-sans">Nitrate (as NO₃)</td>
                    <td className="py-3 px-4 text-cyan-300">mg/L</td>
                    <td className="py-3 px-4 text-emerald-300 font-bold">45</td>
                    <td className="py-3 px-4 text-slate-400">No relaxation</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">Methaemoglobinaemia (Blue Baby Syndrome) in infants</td>
                  </tr>
                  <tr className="hover:bg-[#0c1a40] transition">
                    <td className="py-3 px-4 font-bold text-white font-sans">Residual Free Chlorine</td>
                    <td className="py-3 px-4 text-cyan-300">mg/L</td>
                    <td className="py-3 px-4 text-emerald-300 font-bold">0.2 (Min)</td>
                    <td className="py-3 px-4 text-amber-300 font-bold">1.0 (Max)</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">Ensures residual bactericidal protection across distribution pipes</td>
                  </tr>
                  <tr className="hover:bg-[#0c1a40] transition">
                    <td className="py-3 px-4 font-bold text-rose-300 font-sans">E. coli / Faecal Coliform</td>
                    <td className="py-3 px-4 text-cyan-300">CFU/100mL</td>
                    <td className="py-3 px-4 text-rose-400 font-bold">0 (Absent)</td>
                    <td className="py-3 px-4 text-slate-400">No relaxation</td>
                    <td className="py-3 px-4 text-rose-200 font-sans">Acute bacterial contamination, waterborne pathogen outbreaks</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl bg-[#091533] border border-[#1e3470] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>NABL Quality Assurance: Calibrated analytical spectrophotometers, turbidity meters, and incubators.</span>
              </div>
              <span className="font-mono text-cyan-300">GWALIOR MUNICIPAL PHED LAB</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LabPortalPage;
