import { useState } from 'react';
import type { FC } from 'react';
import {
  Bell,
  Camera,
  ChevronRight,
  Clock,
  Cloud,
  Database,
  Key,
  Layers,
  Link2,
  Lock,
  Mail,
  RefreshCw,
  Settings,
  Shield,
  Sliders,
  Smartphone,
  User,
  Wrench,
} from 'lucide-react';

type SettingsTab = 'general' | 'notifications' | 'integrations' | 'security' | 'system';

export const SettingsView: FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Form states
  const [orgName, setOrgName] = useState('Water Quality Alert System');
  const [contactEmail, setContactEmail] = useState('admin@wateralert.gov.in');
  const [contactPhone, setContactPhone] = useState('+91 98765 43210');

  // Preferences
  const [defaultView, setDefaultView] = useState('Admin Dashboard');
  const [refreshInterval, setRefreshInterval] = useState('5 minutes');
  const [timeZone, setTimeZone] = useState('Asia/Kolkata (UTC+05:30)');
  const [dateFormat, setDateFormat] = useState('DD MMM YYYY (01 Nov 2026)');
  const [unitSystem, setUnitSystem] = useState<'mg/L' | 'ppm'>('mg/L');

  // Notification Toggles
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState(true);

  // Security Toggles
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30 minutes');

  // System Toggles
  const [retentionPeriod, setRetentionPeriod] = useState('12 months');
  const [autoBackup, setAutoBackup] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  return (
    <div className="space-y-5 font-sans">
      {/* ── SETTINGS TABS (Matching Screenshot 3) ── */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        {[
          { id: 'general', label: 'General', icon: <Sliders className="w-4 h-4" /> },
          { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
          { id: 'integrations', label: 'Integrations', icon: <Link2 className="w-4 h-4" /> },
          { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
          { id: 'system', label: 'System', icon: <Layers className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SettingsTab)}
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

      {/* ── 2-COLUMN GRID OF SETTINGS SECTIONS (Matching Screenshot 3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ========================================================= */}
        {/* CARD 1: Profile & Organization                            */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Profile &amp; Organization</h3>
            </div>
          </div>

          {/* User info row with photo change button */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-lg">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Admin User</div>
                <div className="text-xs text-slate-500">{contactEmail}</div>
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  Administrator
                </span>
              </div>
            </div>
            <button className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl transition shadow-xs">
              <Camera className="w-3.5 h-3.5 text-slate-500" />
              <span>Change Photo</span>
            </button>
          </div>

          {/* Form fields */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 2: System Preferences                                */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">System Preferences</h3>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-600">Default Dashboard View</label>
              <select
                value={defaultView}
                onChange={e => setDefaultView(e.target.value)}
                className="w-56 px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option>Admin Dashboard</option>
                <option>Alerts &amp; Incidents</option>
                <option>Water Sources</option>
                <option>Readings</option>
                <option>Reports</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-600">Data Refresh Interval</label>
              <select
                value={refreshInterval}
                onChange={e => setRefreshInterval(e.target.value)}
                className="w-56 px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option>1 minute</option>
                <option>5 minutes</option>
                <option>15 minutes</option>
                <option>30 minutes</option>
                <option>Manual only</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-600">Time Zone</label>
              <select
                value={timeZone}
                onChange={e => setTimeZone(e.target.value)}
                className="w-56 px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option>Asia/Kolkata (UTC+05:30)</option>
                <option>UTC (Coordinated Universal Time)</option>
                <option>America/New_York (UTC-05:00)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-600">Date Format</label>
              <select
                value={dateFormat}
                onChange={e => setDateFormat(e.target.value)}
                className="w-56 px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option>DD MMM YYYY (01 Nov 2026)</option>
                <option>YYYY-MM-DD (2026-11-01)</option>
                <option>MM/DD/YYYY (11/01/2026)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="text-[11px] font-semibold text-slate-600">Units</label>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setUnitSystem('mg/L')}
                  className={`px-4 py-1 rounded-lg text-xs font-bold transition ${
                    unitSystem === 'mg/L' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  mg/L
                </button>
                <button
                  type="button"
                  onClick={() => setUnitSystem('ppm')}
                  className={`px-4 py-1 rounded-lg text-xs font-bold transition ${
                    unitSystem === 'ppm' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ppm
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 3: Notification Settings                             */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Notification Settings</h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Configure alert and system notifications.</p>
          </div>

          <div className="divide-y divide-slate-100 space-y-3">
            {/* Email Notifications */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Email Notifications</div>
                  <div className="text-[11px] text-slate-500">Receive alerts, incidents, and reports via email</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmailNotifs(!emailNotifs)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  emailNotifs ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                    emailNotifs ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* SMS Notifications */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">SMS Notifications</div>
                  <div className="text-[11px] text-slate-500">Send critical alerts via SMS</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSmsNotifs(!smsNotifs)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  smsNotifs ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                    smsNotifs ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* In-App Notifications */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">In-App Notifications</div>
                  <div className="text-[11px] text-slate-500">Show real-time alerts in the dashboard</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInAppNotifs(!inAppNotifs)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  inAppNotifs ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                    inAppNotifs ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 4: Integrations                                      */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Integrations</h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Manage external services and data connections.</p>
          </div>

          <div className="divide-y divide-slate-100 space-y-3">
            {/* AWS Services */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                  aws
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">AWS Services</div>
                  <div className="text-[11px] text-slate-500">(Lambda, S3, SNS, DynamoDB)</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Connected
                </span>
                <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Database */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Database</div>
                  <div className="text-[11px] text-slate-500">(DynamoDB)</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Connected
                </span>
                <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* External Data Source */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">External Data Source</div>
                  <div className="text-[11px] text-slate-500">(Open APIs)</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Connected
                </span>
                <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 5: Security                                          */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Security</h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Manage authentication and access security.</p>
          </div>

          <div className="divide-y divide-slate-100 space-y-3">
            {/* Password Policy */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Password Policy</div>
                  <div className="text-[11px] text-slate-500">Set password rules and expiry</div>
                </div>
              </div>
              <button className="p-1.5 text-slate-400 hover:text-slate-600 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* MFA */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Multi-Factor Authentication (MFA)</div>
                  <div className="text-[11px] text-slate-500">Add an extra layer of security for admin users</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMfaEnabled(!mfaEnabled)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  mfaEnabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                    mfaEnabled ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Session Timeout */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Session Timeout</div>
                  <div className="text-[11px] text-slate-500">Automatically log out inactive users</div>
                </div>
              </div>
              <select
                value={sessionTimeout}
                onChange={e => setSessionTimeout(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option>15 minutes</option>
                <option>30 minutes</option>
                <option>1 hour</option>
                <option>4 hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 6: System Settings                                   */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">System Settings</h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Configure operational and application settings.</p>
          </div>

          <div className="divide-y divide-slate-100 space-y-3">
            {/* Data Retention Period */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Data Retention Period</div>
                  <div className="text-[11px] text-slate-500">How long to keep readings, alerts, and logs</div>
                </div>
              </div>
              <select
                value={retentionPeriod}
                onChange={e => setRetentionPeriod(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option>6 months</option>
                <option>12 months</option>
                <option>24 months</option>
                <option>Indefinite</option>
              </select>
            </div>

            {/* Auto Data Backup */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Auto Data Backup</div>
                  <div className="text-[11px] text-slate-500">Schedule periodic backups to S3</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoBackup(!autoBackup)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  autoBackup ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                    autoBackup ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Maintenance Mode */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Maintenance Mode</div>
                  <div className="text-[11px] text-slate-500">Temporarily restrict system access</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  maintenanceMode ? 'bg-amber-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                    maintenanceMode ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
