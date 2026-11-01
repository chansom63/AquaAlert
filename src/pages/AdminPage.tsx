import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Cloud,
  Droplets,
  FlaskConical,
  Folder,
  LayoutDashboard,
  LogOut,
  MapPin,
  Monitor,
  Plus,
  Settings,
  SlidersHorizontal,
  User,
  Users,
  X,
} from 'lucide-react';
import { AdminDashboardView } from '../components/admin/AdminDashboardView';
import AlertsPanel from '../components/portal/AlertsPanel';
import SourcesPanel from '../components/portal/SourcesPanel';
import SourceDetailDrawer from '../components/sources/SourceDetailDrawer';
import AlertDetailDrawer from '../components/alerts/AlertDetailDrawer';
import { useWaterData } from '../hooks/useWaterData';
import LabReportsPanel from './admin/LabReportsPanel';
import SubmitReadingPanel from './admin/SubmitReadingPanel';

const AdminPage: FC = () => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('Admin Dashboard');
  const [drawerSourceId, setDrawerSourceId] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeModal, setActiveModal] = useState<'submit-reading' | 'record-action' | 'rules' | 'upload-evidence' | null>(null);

  const data = useWaterData();

  const alertParam = searchParams.get('alert');
  useEffect(() => {
    if (alertParam) {
      setSelectedAlertId(alertParam);
    }
  }, [alertParam]);

  const handleCloseAlertDrawer = () => {
    setSelectedAlertId(null);
    if (searchParams.has('alert')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('alert');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleSelectAlert = (alertId: string) => {
    setSelectedAlertId(alertId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('alert', alertId);
    setSearchParams(nextParams, { replace: true });
  };

  const handleQuickAction = (action: 'submit-reading' | 'record-action' | 'rules' | 'upload-evidence') => {
    setActiveModal(action);
  };

  return (
    <div className="flex min-h-screen bg-[#F3F6FA] text-slate-800 font-sans selection:bg-blue-500 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR NAVIGATION (Dark Navy #0B1728)                             */}
      {/* ========================================================================= */}
      <aside className="w-64 bg-[#0A1728] text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800/80 shadow-2xl z-30">
        <div>
          {/* Brand Logo & Name */}
          <div className="px-5 py-5 border-b border-slate-800/80 flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-cyan-500 to-blue-400 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              <div className="w-full h-full bg-[#0A1728] rounded-[10px] flex items-center justify-center">
                <Droplets className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div className="leading-tight">
              <h2 className="text-xs font-black text-white tracking-wide uppercase">
                Transparent Public
              </h2>
              <div className="text-[11px] text-cyan-400 font-semibold tracking-tight">
                Water Quality Alert System
              </div>
            </div>
          </div>

          {/* Primary Navigation Menu */}
          <nav className="p-3 space-y-1">
            {/* Admin Dashboard (Active) */}
            <button
              onClick={() => setActiveNav('Admin Dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'Admin Dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Admin Dashboard</span>
            </button>

            {/* Readings */}
            <button
              onClick={() => setActiveNav('Readings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'Readings'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FlaskConical className="w-4 h-4 shrink-0" />
              <span>Readings</span>
            </button>

            {/* Water Sources */}
            <button
              onClick={() => setActiveNav('Water Sources')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'Water Sources'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span>Water Sources</span>
            </button>

            {/* Alerts & Incidents (with badge 5) */}
            <button
              onClick={() => setActiveNav('Alerts & Incidents')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'Alerts & Incidents'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Alerts &amp; Incidents</span>
              </div>
              <span className="bg-rose-600 text-white text-[11px] font-black px-1.5 py-0.2 rounded-full leading-none">
                5
              </span>
            </button>

            {/* Response Actions */}
            <button
              onClick={() => setActiveNav('Response Actions')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'Response Actions'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span>Response Actions</span>
            </button>

            {/* Rules & Thresholds */}
            <button
              onClick={() => setActiveNav('Rules & Thresholds')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'Rules & Thresholds'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span>Rules &amp; Thresholds</span>
            </button>

            {/* Evidence (S3) */}
            <button
              onClick={() => setActiveNav('Evidence (S3)')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'Evidence (S3)'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Folder className="w-4 h-4 shrink-0" />
              <span>Evidence (S3)</span>
            </button>

            {/* Reports */}
            <button
              onClick={() => setActiveNav('Reports')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'Reports'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Reports</span>
            </button>

            {/* Administration Section */}
            <div className="pt-4 pb-1 px-3">
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                Administration
              </span>
            </div>

            {/* Users & Roles */}
            <button
              onClick={() => setActiveNav('Users & Roles')}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'Users & Roles'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Users &amp; Roles</span>
            </button>

            {/* System & Logs */}
            <button
              onClick={() => setActiveNav('System & Logs')}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'System & Logs'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Monitor className="w-4 h-4 shrink-0" />
              <span>System &amp; Logs</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setActiveNav('Settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'Settings'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Bottom Switch to Public Portal Link */}
        <div className="p-3 border-t border-slate-800/80">
          <button
            onClick={() => navigate('/user')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition"
          >
            <span>Citizen Portal View</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN DASHBOARD CONTENT AREA                                            */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        {/* TOP HEADER BAR matching screenshot */}
        <header className="bg-white border-b border-slate-200/90 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              {activeNav === 'Admin Dashboard' ? 'Admin Dashboard' : activeNav}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeNav === 'Admin Dashboard'
                ? 'Monitor water quality, manage alerts, and take response actions'
                : `Operational management view for ${activeNav}`}
            </p>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Pill: AWS Serverless MVP (Demo) */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-xs">
              <Cloud className="w-3.5 h-3.5 text-slate-500" />
              <span>AWS Serverless MVP (Demo)</span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                className="relative w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 transition shadow-xs cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
              </button>

              {/* Notification Popover */}
              {showNotificationMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in-50 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold text-slate-800">
                    <span>Recent Notifications</span>
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">3 New</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs py-1">
                    <div className="py-2">
                      <div className="font-semibold text-rose-600">Critical Alert Triggered</div>
                      <div className="text-[11px] text-slate-500">Source A-04 (Jhansi) recorded pH 9.4</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">2 min ago</div>
                    </div>
                    <div className="py-2">
                      <div className="font-semibold text-orange-600">High Turbidity Warning</div>
                      <div className="text-[11px] text-slate-500">Source B-02 (Orchha) Turbidity: 12.6 NTU</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">15 min ago</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-full border border-slate-200 hover:border-slate-300 bg-white transition shadow-xs cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <div className="text-xs font-bold text-slate-900">Admin User</div>
                  <div className="text-[11px] text-slate-500">Administrator</div>
                </div>
              </button>

              {/* User Menu Popover */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-900">Admin User</div>
                    <div className="text-[10px] text-slate-500">admin@waterquality.gov.in</div>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/user');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-xl flex items-center justify-between transition mt-1"
                  >
                    <span>Citizen Portal</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl flex items-center justify-between transition"
                  >
                    <span>Exit Admin</span>
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* DASHBOARD BODY CONTAINER */}
        <div className="p-6 space-y-6">
          {/* Main Dashboard Screen (Matching user screenshot) */}
          {activeNav === 'Admin Dashboard' && (
            <AdminDashboardView
              sources={data.sources}
              alerts={data.alerts}
              onOpenAlertDetail={handleSelectAlert}
              onOpenSourceDetail={(srcId) => {
                data.setSelected(srcId);
                setDrawerSourceId(srcId);
              }}
              onNavigateTo={(tab) => setActiveNav(tab)}
              onQuickAction={handleQuickAction}
            />
          )}

          {/* Alerts & Incidents Panel */}
          {activeNav === 'Alerts & Incidents' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Incident Queue &amp; Response Actions</h3>
                  <p className="text-xs text-slate-500">Manage all screening violations, advisory notices, and laboratory test workflows.</p>
                </div>
                <button
                  onClick={() => setActiveNav('Admin Dashboard')}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  &larr; Back to Dashboard
                </button>
              </div>
              <AlertsPanel
                admin={true}
                alerts={data.alerts}
                sources={data.sources}
                busy={data.busy}
                onSelect={(srcId) => {
                  data.setSelected(srcId);
                  setDrawerSourceId(srcId);
                }}
                onSelectAlert={(a) => handleSelectAlert(a.alertId)}
                onSubmitAction={data.submitAction}
              />
            </div>
          )}

          {/* Water Sources Panel */}
          {activeNav === 'Water Sources' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Water Monitoring Stations Directory</h3>
                  <p className="text-xs text-slate-500">Browse stations, test coverage, and geological catchment networks.</p>
                </div>
                <button
                  onClick={() => setActiveNav('Admin Dashboard')}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  &larr; Back to Dashboard
                </button>
              </div>
              <SourcesPanel
                admin={true}
                loading={data.loading}
                sources={data.visibleSources}
                areas={data.GWALIOR_AREAS}
                area={data.area}
                query={data.query}
                selectedSource={data.selectedSource}
                readings={data.readings}
                onAreaChange={data.setArea}
                onQueryChange={data.setQuery}
                onSelect={(srcId) => {
                  data.setSelected(srcId);
                  setDrawerSourceId(srcId);
                }}
              />
            </div>
          )}

          {/* Readings Panel */}
          {activeNav === 'Readings' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Telemetry &amp; Field Readings Ledger</h3>
                  <p className="text-xs text-slate-500">All recorded field sensor measurements and certified laboratory reports.</p>
                </div>
                <button
                  onClick={() => handleQuickAction('submit-reading')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm"
                >
                  + Record Field Reading
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                      <th className="py-2.5 px-3">Reading ID</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-3">Parameter</th>
                      <th className="py-2.5 px-3">Value</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Verification</th>
                      <th className="py-2.5 px-3 text-right">Collected At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">RD-2026-03124</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">A-04 (Jhansi)</td>
                      <td className="py-2.5 px-3 text-slate-700">pH</td>
                      <td className="py-2.5 px-3 font-bold text-rose-600">9.4</td>
                      <td className="py-2.5 px-3 text-slate-600">Field Test</td>
                      <td className="py-2.5 px-3"><span className="bg-sky-100 text-sky-700 text-xs px-2 py-0.5 rounded-full font-medium">Screening</span></td>
                      <td className="py-2.5 px-3 text-right text-slate-500">01 Nov 2026, 07:40 PM</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">RD-2026-03123</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">B-02 (Orchha)</td>
                      <td className="py-2.5 px-3 text-slate-700">Turbidity</td>
                      <td className="py-2.5 px-3 font-bold text-rose-600">12.6 NTU</td>
                      <td className="py-2.5 px-3 text-slate-600">Field Test</td>
                      <td className="py-2.5 px-3"><span className="bg-sky-100 text-sky-700 text-xs px-2 py-0.5 rounded-full font-medium">Screening</span></td>
                      <td className="py-2.5 px-3 text-right text-slate-500">01 Nov 2026, 06:28 PM</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">RD-2026-03122</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">C-01 (Datia)</td>
                      <td className="py-2.5 px-3 text-slate-700">TDS</td>
                      <td className="py-2.5 px-3 font-bold text-rose-600">1,240 mg/L</td>
                      <td className="py-2.5 px-3 text-slate-600">Lab Test</td>
                      <td className="py-2.5 px-3"><span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">Lab Verified</span></td>
                      <td className="py-2.5 px-3 text-right text-slate-500">01 Nov 2026, 05:55 PM</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">RD-2026-03121</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">D-03 (Lalitpur)</td>
                      <td className="py-2.5 px-3 text-slate-700">pH</td>
                      <td className="py-2.5 px-3 font-bold text-rose-600">6.3</td>
                      <td className="py-2.5 px-3 text-slate-600">Field Test</td>
                      <td className="py-2.5 px-3"><span className="bg-sky-100 text-sky-700 text-xs px-2 py-0.5 rounded-full font-medium">Screening</span></td>
                      <td className="py-2.5 px-3 text-right text-slate-500">01 Nov 2026, 05:10 PM</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">RD-2026-03120</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">E-05 (Jhansi)</td>
                      <td className="py-2.5 px-3 text-slate-700">Bacteria</td>
                      <td className="py-2.5 px-3 font-bold text-rose-600">Detected</td>
                      <td className="py-2.5 px-3 text-slate-600">Lab Test</td>
                      <td className="py-2.5 px-3"><span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">Lab Verified</span></td>
                      <td className="py-2.5 px-3 text-right text-slate-500">01 Nov 2026, 03:45 PM</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Evidence (S3) Panel */}
          {activeNav === 'Evidence (S3)' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <LabReportsPanel sources={data.sources} busy={data.busy} onSubmit={data.uploadReport} />
            </div>
          )}

          {/* Rules & Thresholds / Response Actions / Administration placeholders */}
          {(activeNav === 'Rules & Thresholds' || activeNav === 'Response Actions' || activeNav === 'Reports' || activeNav === 'Users & Roles' || activeNav === 'System & Logs' || activeNav === 'Settings') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{activeNav} Workspace</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All parameters, administrative roles, and compliance policies are currently synchronized with the AWS Serverless cluster.
              </p>
              <button
                onClick={() => setActiveNav('Admin Dashboard')}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. MODALS FOR QUICK ACTIONS                                               */}
      {/* ========================================================================= */}

      {/* Submit Reading Modal */}
      {activeModal === 'submit-reading' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Submit Field Reading</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4">
              <SubmitReadingPanel sources={data.sources} busy={data.busy} onSubmit={data.submitReading} />
            </div>
          </div>
        </div>
      )}

      {/* Record Action Modal */}
      {activeModal === 'record-action' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Record Response Action</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Alert ID</label>
                <select className="w-full rounded-xl border border-slate-300 p-2 text-xs">
                  <option>ALT-2026-0158 (A-04 Jhansi - pH: 9.4)</option>
                  <option>ALT-2026-0157 (B-02 Orchha - Turbidity: 12.6 NTU)</option>
                  <option>ALT-2026-0156 (C-01 Datia - TDS: 1,240 mg/L)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Action Type</label>
                <select className="w-full rounded-xl border border-slate-300 p-2 text-xs">
                  <option>FIELD INVESTIGATION &rarr; Investigating</option>
                  <option>CHLORINATION FLUSH &rarr; Disinfection</option>
                  <option>BOIL-WATER ADVISORY &rarr; Public Warning</option>
                  <option>SAMPLE LAB DISPATCH &rarr; Verification</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Justification / Summary</label>
                <textarea
                  rows={3}
                  placeholder="Describe operational engineering steps taken..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    alert('Action successfully appended to audit ledger.');
                    setActiveModal(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
                >
                  Commit Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules & Thresholds Modal */}
      {activeModal === 'rules' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Rules &amp; Thresholds Configuration</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">pH Permissible Range</div>
                  <div className="text-slate-500 text-[11px]">BIS IS 10500 Standard: 6.5 &ndash; 8.5</div>
                </div>
                <span className="font-mono font-bold text-blue-600 bg-white px-2 py-1 rounded border border-slate-200">6.5 - 8.5</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Turbidity Upper Limit</div>
                  <div className="text-slate-500 text-[11px]">Max Acceptable: 1.0 NTU (Permissible: 5.0 NTU)</div>
                </div>
                <span className="font-mono font-bold text-blue-600 bg-white px-2 py-1 rounded border border-slate-200">&le; 5.0 NTU</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">TDS Maximum Threshold</div>
                  <div className="text-slate-500 text-[11px]">Desirable: 500 mg/L &bull; Permissible: 2000 mg/L</div>
                </div>
                <span className="font-mono font-bold text-blue-600 bg-white px-2 py-1 rounded border border-slate-200">&le; 500 mg/L</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Residual Free Chlorine</div>
                  <div className="text-slate-500 text-[11px]">Minimum mandatory disinfection residual: 0.2 mg/L</div>
                </div>
                <span className="font-mono font-bold text-blue-600 bg-white px-2 py-1 rounded border border-slate-200">&ge; 0.2 mg/L</span>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition"
                >
                  Close &amp; Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Lab Evidence Modal */}
      {activeModal === 'upload-evidence' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 animate-in fade-in-50 zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Upload Certified Lab Evidence (S3)</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4">
              <LabReportsPanel
                sources={data.sources}
                busy={data.busy}
                onSubmit={(e) => {
                  data.uploadReport(e);
                  setActiveModal(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Detail Drawer */}
      {drawerSourceId && (
        <SourceDetailDrawer
          sourceId={drawerSourceId}
          onClose={() => setDrawerSourceId(null)}
          isStaff={true}
          onOpenSubmitReading={(srcId) => {
            setDrawerSourceId(null);
            handleQuickAction('submit-reading');
            if (srcId) data.setSelected(srcId);
          }}
        />
      )}

      {/* Alert Detail Drawer */}
      {selectedAlertId && (
        <AlertDetailDrawer
          alertId={selectedAlertId}
          alerts={data.alerts}
          sources={data.sources}
          onClose={handleCloseAlertDrawer}
          onOpenSource={(srcId) => {
            handleCloseAlertDrawer();
            data.setSelected(srcId);
            setDrawerSourceId(srcId);
          }}
          isStaff={true}
        />
      )}
    </div>
  );
};

export default AdminPage;
