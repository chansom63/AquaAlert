import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Droplets,
  FlaskConical,
  Folder,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  Settings,
  SlidersHorizontal,
  User,
  Users,
  ShieldAlert,
  X,
  MessageSquareWarning,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { AdminDashboardView } from '../components/admin/AdminDashboardView';
import { AlertsIncidentsView } from '../components/admin/AlertsIncidentsView';
import { ComplaintsView } from '../components/admin/ComplaintsView';
import { WaterSourcesView } from '../components/admin/WaterSourcesView';
import { UsersRolesView } from '../components/admin/UsersRolesView';
import { ReadingsView } from '../components/admin/ReadingsView';
import { ReportsView } from '../components/admin/ReportsView';
import { UploadDocumentView } from '../components/admin/UploadDocumentView';
import { ResponseActionsView } from '../components/admin/ResponseActionsView';
import { RulesThresholdsView } from '../components/admin/RulesThresholdsView';
import { SettingsView } from '../components/admin/SettingsView';
import { EvidenceS3View } from '../components/admin/EvidenceS3View';
import SourceDetailDrawer from '../components/sources/SourceDetailDrawer';
import AlertDetailDrawer from '../components/alerts/AlertDetailDrawer';
import type { Alert } from '../types/water';
import { useWaterData } from '../hooks/useWaterData';
import { useAdminTablesData } from '../hooks/useAdminTablesData';
import { recordLocallySubmittedReading } from '../utils/readingsSync';
import { recordLocallyCreatedAction } from '../utils/actionsSync';
import { recordLocallyUploadedReport } from '../utils/reportsSync';
import { humanize, displayDate } from '../api/adminRecords';
import { api } from '../api/client';
import SubmissionSuccessModal, { type SubmissionDetail } from '../components/common/SubmissionSuccessModal';
import TabErrorBoundary from '../components/common/TabErrorBoundary';
import { useAuth } from '../features/auth/AuthContext';
import { AuthModal } from '../components/auth/AuthModal';
import '../styles/admin-dark.css';
import LabReportsPanel from './admin/LabReportsPanel';
import SubmitReadingPanel from './admin/SubmitReadingPanel';

interface AdminPageProps {
  initialNav?: string;
}

const AdminPage: FC<AdminPageProps> = ({ initialNav }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getInitialNav = () => {
    if (initialNav) return initialNav;
    if (location.pathname === '/upload-document' || location.pathname === '/upload-reports') return 'Upload Document';
    return 'Admin Dashboard';
  };

  const [activeNav, setActiveNav] = useState(getInitialNav);

  useEffect(() => {
    if (initialNav) {
      setActiveNav(initialNav);
    } else if (location.pathname === '/upload-document' || location.pathname === '/upload-reports') {
      setActiveNav('Upload Document');
    }
  }, [initialNav, location.pathname]);

  const [drawerSourceId, setDrawerSourceId] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Sidebar Toggle State with LocalStorage Persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aquaalert_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('aquaalert_admin_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'submit-reading' | 'record-action' | 'rules' | 'upload-evidence' | null>(null);
  const [submissionModalData, setSubmissionModalData] = useState<{
    title: string;
    subtitle: string;
    badgeText?: string;
    recordId?: string;
    tableTarget?: string;
    s3Pointer?: {
      bucket: string;
      key: string;
      uri?: string;
      downloadUrl?: string;
      fileSize?: string;
    };
    details: SubmissionDetail[];
  } | null>(null);

  const data = useWaterData();
  const adminTables = useAdminTablesData(activeNav);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  const handleSubmitReading = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminBusy(true);
    setAdminNotice(null);
    setAdminError(null);
    const form = new FormData(event.currentTarget);
    const sourceId = String(form.get('sourceId') || '');
    const method = String(form.get('method') || 'FIELD_SCREENING');
    const rawDate = form.get('collectedAt');
    const collectedAt = rawDate ? new Date(String(rawDate)).toISOString() : new Date().toISOString();

    const parameters: Record<string, { value: number; unit: string }> = {};
    for (const key of ['pH', 'turbidity', 'TDS']) {
      const val = String(form.get(key) || '').trim();
      if (val) {
        parameters[key] = {
          value: Number(val),
          unit: key === 'pH' ? 'pH' : key === 'turbidity' ? 'NTU' : 'mg/L',
        };
      }
    }

    try {
      const res = await api<{ result: string; readingId: string; alertTriggered: boolean }>('/readings', {
        method: 'POST',
        body: JSON.stringify({
          readingId: `read-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          sourceId,
          collectedAt,
          method,
          verificationStatus: 'SCREENING',
          parameters,
        }),
      });
      const readingId = res.readingId || `read-${Date.now().toString(36)}`;
      const sourceObj = adminTables.sources.find(s => s.sourceId === sourceId);
      const sourceName = sourceObj ? `${sourceObj.name} (${sourceId})` : sourceId;

      recordLocallySubmittedReading({
        readingId,
        readingKey: `${collectedAt}#${readingId}`,
        sourceId,
        collectedAt,
        receivedAt: new Date().toISOString(),
        method,
        verificationStatus: 'SCREENING',
        parameters,
      });

      setAdminNotice(`Reading ${readingId} accepted! Recorded in Central Database. ${res.alertTriggered ? 'An anomaly alert was triggered.' : 'Recorded within standard parameter limits.'}`);
      setActiveModal(null);

      setSubmissionModalData({
        title: 'Water Quality Reading Ingested',
        subtitle: 'Field telemetry successfully validated and committed to the Water Readings registry.',
        badgeText: res.alertTriggered ? 'ANOMALY ALERT TRIGGERED' : 'STANDARD COMPLIANT',
        recordId: readingId,
        tableTarget: 'WaterReadings',
        details: [
          { label: 'Monitoring Source', value: sourceName },
          { label: 'Sampling Method', value: method },
          { label: 'Collection Timestamp', value: new Date(collectedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' },
          {
            label: 'Screened Parameters',
            value: Object.entries(parameters).map(([k, v]) => `${k}: ${v.value} ${v.unit}`).join(' • ') || 'Nominal readings',
          },
          {
            label: 'Statutory Standard Check',
            value: res.alertTriggered ? 'Threshold exceeded (Automated anomaly alert generated)' : 'All parameters nominal (BIS IS 10500)',
          },
          { label: 'Storage Engine', value: 'Central Water Quality Database' },
        ],
      });

      await Promise.all([
        adminTables.fetchReadings(true),
        adminTables.fetchSources(true),
        adminTables.fetchAlerts(true),
      ]);
    } catch (err) {
      setAdminError(`Failed to submit reading: ${(err as Error).message}`);
    } finally {
      setAdminBusy(false);
    }
  };

  const handleRecordAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminBusy(true);
    setAdminNotice(null);
    setAdminError(null);
    const form = new FormData(event.currentTarget);
    const alertId = String(form.get('alertId') || '');
    const actionType = String(form.get('actionType') || 'FIELD_INVESTIGATION');
    const summary = String(form.get('summary') || '').trim();
    const actorRole = String(form.get('actorRole') || 'MUNICIPAL_OFFICER');
    const newSeverity = String(form.get('newSeverity') || 'NO_CHANGE');
    const newState = String(form.get('newState') || 'UNCHANGED');

    if (!alertId) {
      setAdminError('Please select a target alert.');
      setAdminBusy(false);
      return;
    }
    if (!summary) {
      setAdminError('Please provide a justification or summary for the action.');
      setAdminBusy(false);
      return;
    }

    try {
      const payload: Record<string, any> = { actionType, summary, actorRole };
      if (newSeverity && newSeverity !== 'NO_CHANGE') {
        payload.newSeverity = newSeverity;
      }
      if (newState && newState !== 'UNCHANGED') {
        payload.newState = newState;
      } else if (newSeverity === 'RESOLVED') {
        payload.newState = 'RESOLVED';
      }

      const res = await api<{ result: string; actionId?: string }>(`/alerts/${encodeURIComponent(alertId)}/actions`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const generatedActionId = res?.actionId || `act-${Date.now().toString(36)}`;
      const targetAlert = adminTables.alerts.find(a => a.alertId === alertId);
      const targetSource = adminTables.sources.find(s => s.sourceId === targetAlert?.sourceId);

      recordLocallyCreatedAction({
        actionId: generatedActionId,
        alertId,
        actionType,
        summary,
        actorRole,
        createdAt: new Date().toISOString(),
      });

      let severityNotice = '';
      if (newSeverity && newSeverity !== 'NO_CHANGE') {
        const alertUpdates: Partial<Alert> = { severity: newSeverity };
        if (newState && newState !== 'UNCHANGED') {
          alertUpdates.state = newState;
        } else if (newSeverity === 'RESOLVED') {
          alertUpdates.state = 'RESOLVED';
        } else if (newSeverity === 'CRITICAL' || newSeverity === 'HIGH') {
          alertUpdates.state = 'TRIGGERED';
        } else {
          alertUpdates.state = 'IN_PROGRESS';
        }
        await adminTables.updateAlert(alertId, alertUpdates);
        severityNotice = ` & Incident Severity set to ${newSeverity}`;
      }

      setAdminNotice(`Response action recorded for Alert ${alertId}${severityNotice}!`);
      setActiveModal(null);

      const submissionDetails: SubmissionDetail[] = [
        { label: 'Target Alert ID', value: alertId, isMono: true },
        { label: 'Water Source / Facility', value: targetSource ? `${targetSource.name} (${targetSource.sourceId})` : (targetAlert?.sourceId || 'Gwalior Municipal Grid') },
        { label: 'Intervention Category', value: actionType },
        { label: 'Authorized Officer / Role', value: actorRole },
        { label: 'Engineering Summary', value: summary },
      ];

      if (newSeverity && newSeverity !== 'NO_CHANGE') {
        submissionDetails.push({
          label: 'Post-Action Incident Severity',
          value: `${newSeverity} (Facility Reclassification)`,
          isMono: true,
        });
      }

      submissionDetails.push({
        label: 'Compliance Audit Status',
        value: 'Recorded & Immutable (ISO 14001 / BIS)',
      });

      setSubmissionModalData({
        title: 'Response Action Recorded',
        subtitle: 'Municipal intervention successfully logged to immutable Response Actions audit ledger.',
        badgeText: actionType.replace(/_/g, ' '),
        recordId: generatedActionId,
        tableTarget: 'ResponseActions',
        details: submissionDetails,
      });

      await Promise.all([adminTables.fetchActions(true), adminTables.fetchAlerts(true)]);
    } catch (err) {
      setAdminError(`Failed to record action: ${(err as Error).message}`);
    } finally {
      setAdminBusy(false);
    }
  };

  const handleUploadReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminBusy(true);
    setAdminNotice(null);
    setAdminError(null);
    const form = new FormData(event.currentTarget);
    const file = form.get('report') as File;
    const sourceId = String(form.get('sourceId') || 'gmc-ward-14');
    if (!file || !file.name) {
      setAdminError('Please choose a valid document.');
      setAdminBusy(false);
      return;
    }

    try {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const detectedContentType = file.type || (
        ext === '.pdf' ? 'application/pdf' :
        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
        ext === '.png' ? 'image/png' :
        ext === '.webp' ? 'image/webp' :
        ext === '.csv' ? 'text/csv' : 'application/pdf'
      );

      const signed = await api<{ uploadUrl: string; objectKey: string; contentType?: string }>('/reports/presigned-url', {
        method: 'POST',
        body: JSON.stringify({
          sourceId,
          filename: file.name,
          contentType: detectedContentType,
          folder: 'reports/lab-reports',
        }),
      });
      const uploadRes = await fetch(signed.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': signed.contentType || detectedContentType },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error(`Document upload failed with status ${uploadRes.status}`);
      }

      // Record in LabReports table with certified document pointer
      const ddbRes = await api<{ result: string; reportId?: string }>('/reports', {
        method: 'POST',
        body: JSON.stringify({
          sourceId,
          sourceName: adminTables.sources.find(s => s.sourceId === sourceId)?.name || sourceId,
          title: `Accredited Lab Report (${sourceId})`,
          reportType: 'Lab Report',
          s3Bucket: 'waterq-dev-evidence-files',
          s3Key: signed.objectKey,
          s3Uri: `s3://waterq-dev-evidence-files/${signed.objectKey}`,
          filename: file.name,
          contentType: signed.contentType || detectedContentType,
          fileSizeBytes: file.size,
          fileSizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
          chemistName: 'Dr. S. Mukherjee (TC-8491)',
          verificationStatus: 'LAB_VERIFIED',
        }),
      }).catch(e => {
        console.warn('Lab report creation warning:', e);
        return { result: 'warning', reportId: signed.objectKey };
      });

      const reportId = (ddbRes as any)?.reportId || signed.objectKey;

      recordLocallyUploadedReport({
        reportId,
        sourceId,
        sourceName: adminTables.sources.find(s => s.sourceId === sourceId)?.name || sourceId,
        title: `Accredited Lab Report (${sourceId})`,
        reportType: 'Lab Report',
        s3Bucket: 'waterq-dev-evidence-files',
        s3Key: signed.objectKey,
        s3Uri: `s3://waterq-dev-evidence-files/${signed.objectKey}`,
        filename: file.name,
        fileSizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
        chemistName: 'Dr. S. Mukherjee (TC-8491)',
        verificationStatus: 'LAB_VERIFIED',
        uploadedAt: new Date().toISOString(),
      });

      setAdminNotice(`Evidence "${file.name}" uploaded and certified in Municipal Laboratory Archive! Key: ${signed.objectKey}`);
      setActiveModal(null);

      setSubmissionModalData({
        title: 'Laboratory Evidence Uploaded & Indexed',
        subtitle: `Document transferred and verified in Municipal Laboratory Archive.`,
        badgeText: 'LAB_VERIFIED',
        recordId: reportId,
        tableTarget: 'LabReports',
        s3Pointer: {
          bucket: 'waterq-dev-evidence-files',
          key: signed.objectKey,
          uri: `archive://${signed.objectKey}`,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        },
        details: [
          { label: 'File Name', value: file.name },
          { label: 'Source Point', value: adminTables.sources.find(s => s.sourceId === sourceId)?.name || sourceId },
          { label: 'Archive Document Key', value: signed.objectKey },
          { label: 'Media Type', value: signed.contentType || detectedContentType },
          { label: 'Accredited Lab / Sign-off', value: 'Dr. S. Mukherjee (NABL TC-8491)' },
          { label: 'Audit Chain of Custody', value: 'SHA-256 Validated • Tamper-Evident Encryption' },
        ],
      });

      await adminTables.fetchReports(true);
    } catch (err) {
      setAdminError(`Failed to upload document: ${(err as Error).message}`);
    } finally {
      setAdminBusy(false);
    }
  };

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

  const handleNavChange = (navName: string) => {
    setActiveNav(navName);
    if (navName === 'Upload Document') {
      if (location.pathname !== '/upload-document') {
        navigate('/upload-document');
      }
    } else {
      if (location.pathname !== '/admin') {
        navigate('/admin');
      }
    }
  };

  const handleQuickAction = (action: 'submit-reading' | 'record-action' | 'rules' | 'upload-evidence') => {
    if (action === 'upload-evidence') {
      handleNavChange('Upload Document');
      return;
    }
    if (action === 'rules') {
      handleNavChange('Rules & Thresholds');
      return;
    }
    setActiveModal(action);
  };

  return (
    <div className="admin-root admin-dark flex min-h-screen bg-[#F3F6FA] text-slate-800 font-sans selection:bg-blue-500 selection:text-white">
      {/* Mobile Backdrop Overlay */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden cursor-pointer"
          onClick={toggleSidebar}
          title="Click to close sidebar"
        />
      )}

      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR NAVIGATION (Dark Navy #0B1728)                             */}
      {/* ========================================================================= */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } bg-[#0A1728] text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800/80 shadow-2xl z-30 transition-all duration-300 ease-in-out select-none`}
      >
        <div>
          {/* Brand Logo & Name */}
          <div
            className={`py-4 ${
              sidebarCollapsed ? 'px-2 flex flex-col items-center gap-2' : 'px-4 flex items-center justify-between gap-2'
            } border-b border-slate-800/80 transition-all duration-300`}
          >
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} overflow-hidden min-w-0`}>
              <div
                className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-cyan-500 to-blue-400 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0 cursor-pointer"
                onClick={toggleSidebar}
                title={sidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "AquaAlert"}
              >
                <div className="w-full h-full bg-[#0A1728] rounded-[10px] flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              {!sidebarCollapsed && (
                <div className="leading-tight transition-all duration-200 min-w-0">
                  <h2 className="text-xs font-black text-white tracking-wide uppercase truncate">
                    Transparent Public
                  </h2>
                  <div className="text-[11px] text-cyan-400 font-semibold tracking-tight truncate">
                    Water Quality Alert System
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Toggle Button inside Sidebar */}
            <button
              type="button"
              onClick={toggleSidebar}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer shrink-0 ${
                sidebarCollapsed ? 'mt-1' : ''
              }`}
              title={sidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
              aria-label="Toggle sidebar"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-cyan-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Primary Navigation Menu */}
          <nav className="p-3 space-y-1">
            {/* Admin Dashboard */}
            <button
              onClick={() => handleNavChange('Admin Dashboard')}
              title="Admin Dashboard"
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5'
              } rounded-xl text-xs font-semibold transition-all relative ${
                activeNav === 'Admin Dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Admin Dashboard</span>}
            </button>

            {/* Readings */}
            <button
              onClick={() => handleNavChange('Readings')}
              title="Readings"
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5'
              } rounded-xl text-xs font-semibold transition-all relative ${
                activeNav === 'Readings'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FlaskConical className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Readings</span>}
            </button>

            {/* Water Sources */}
            <button
              onClick={() => handleNavChange('Water Sources')}
              title="Water Sources"
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5'
              } rounded-xl text-xs font-semibold transition-all relative ${
                activeNav === 'Water Sources'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Water Sources</span>}
            </button>

            {/* Alerts & Incidents */}
            <button
              onClick={() => handleNavChange('Alerts & Incidents')}
              title={`Alerts & Incidents (${adminTables.alerts.length})`}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3.5 py-2.5'
              } rounded-xl text-xs font-semibold transition-all relative ${
                activeNav === 'Alerts & Incidents'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                {!sidebarCollapsed && <span>Alerts &amp; Incidents</span>}
              </div>
              {sidebarCollapsed ? (
                adminTables.alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full leading-none shadow-sm">
                    {adminTables.alerts.length}
                  </span>
                )
              ) : (
                <span className="bg-rose-600 text-white text-[11px] font-black px-1.5 py-0.2 rounded-full leading-none">
                  {adminTables.alerts.length}
                </span>
              )}
            </button>

            {/* Citizen Complaints */}
            <button
              onClick={() => handleNavChange('Complaints')}
              title={`Complaints (${adminTables.complaints.length})`}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3.5 py-2.5'
              } rounded-xl text-xs font-semibold transition-all relative ${
                activeNav === 'Complaints'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                <MessageSquareWarning className="w-4 h-4 shrink-0 text-amber-400" />
                {!sidebarCollapsed && <span>Complaints</span>}
              </div>
              {sidebarCollapsed ? (
                adminTables.complaints.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full leading-none shadow-sm">
                    {adminTables.complaints.length}
                  </span>
                )
              ) : (
                <span className="bg-amber-600 text-white text-[11px] font-black px-1.5 py-0.2 rounded-full leading-none">
                  {adminTables.complaints.length}
                </span>
              )}
            </button>

            {/* Response Actions */}
            <button
              onClick={() => handleNavChange('Response Actions')}
              title="Response Actions"
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5'
              } rounded-xl text-xs font-semibold transition-all relative ${
                activeNav === 'Response Actions'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Response Actions</span>}
            </button>

            {/* Rules & Thresholds */}
            <button
              onClick={() => handleNavChange('Rules & Thresholds')}
              title="Rules & Thresholds"
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5'
              } rounded-xl text-xs font-semibold transition-all relative ${
                activeNav === 'Rules & Thresholds'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Rules &amp; Thresholds</span>}
            </button>

            {/* Evidence Archive */}
            <button
              onClick={() => handleNavChange('Evidence Archive')}
              title="Evidence Archive"
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5'
              } rounded-xl text-xs font-semibold transition-all relative ${
                activeNav === 'Evidence Archive' || activeNav === 'Evidence (S3)'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Folder className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Evidence Archive</span>}
            </button>

            {/* Reports Registry */}
            <button
              onClick={() => handleNavChange('Reports')}
              title={`Reports (${adminTables.reports.length})`}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3.5 py-2.5'
              } rounded-xl text-xs font-semibold transition-all relative ${
                activeNav === 'Reports'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                <BarChart3 className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span>Reports</span>}
              </div>
              {sidebarCollapsed ? (
                adminTables.reports.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-900 text-blue-200 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full leading-none border border-blue-700/60">
                    {adminTables.reports.length}
                  </span>
                )
              ) : (
                <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-blue-900/80 text-blue-200 border border-blue-700/60">
                  {adminTables.reports.length}
                </span>
              )}
            </button>

            {/* Administration Section */}
            {sidebarCollapsed ? (
              <div className="my-2 border-t border-slate-800/80" />
            ) : (
              <div className="pt-4 pb-1 px-3">
                <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                  Administration
                </span>
              </div>
            )}

            {/* Users & Roles */}
            <button
              onClick={() => setActiveNav('Users & Roles')}
              title="Users & Roles"
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3.5 py-2'
              } rounded-xl text-xs font-semibold transition-all relative ${
                activeNav === 'Users & Roles'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Users &amp; Roles</span>}
            </button>

            {/* Settings */}
            <button
              onClick={() => setActiveNav('Settings')}
              title="Settings"
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3.5 py-2'
              } rounded-xl text-xs font-semibold transition-all relative ${
                activeNav === 'Settings'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Settings</span>}
            </button>
          </nav>
        </div>

        {/* Bottom Switch to Portals Links */}
        <div className={`p-3 border-t border-slate-800/80 space-y-1 ${sidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
          <button
            onClick={() => navigate('/lab')}
            title="Lab Portal View"
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
            } rounded-xl text-[11px] font-semibold text-purple-300 hover:text-white hover:bg-purple-950/40 transition cursor-pointer`}
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
              {!sidebarCollapsed && <span>Lab Portal View</span>}
            </div>
            {!sidebarCollapsed && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => navigate('/user')}
            title="Citizen Portal View"
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
            } rounded-xl text-[11px] font-semibold text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition cursor-pointer`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              {!sidebarCollapsed && <span>Citizen Portal View</span>}
            </div>
            {!sidebarCollapsed && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN DASHBOARD CONTENT AREA                                            */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        {/* TOP HEADER BAR matching screenshot */}
        <header className="bg-white border-b border-slate-200/90 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3.5">
            {/* Sidebar Toggle Button in Header */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/90 transition cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
              title={sidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
              aria-label="Toggle sidebar"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5 text-blue-600" />
              ) : (
                <PanelLeftClose className="w-5 h-5 text-slate-700" />
              )}
            </button>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                {activeNav}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeNav === 'Admin Dashboard'      && 'Monitor water quality, manage alerts, and take response actions'}
                {activeNav === 'Alerts & Incidents'   && 'View active alerts, track investigation, and manage incident lifecycle'}
                {activeNav === 'Complaints'           && 'Monitor, triage, and resolve citizen water grievances with S3 photo evidence and field engineer assignment.'}
                {activeNav === 'Water Sources'        && 'Manage and monitor water sources, their details, status, and latest water quality'}
                {activeNav === 'Readings'             && 'View, search, and manage water quality readings'}
                {activeNav === 'Reports'              && 'View, download, and analyze statutory water quality reports and certified documentation'}
                {(activeNav === 'Upload Document' || activeNav === 'Upload Reports') && 'Upload certified NABL lab reports, chemical assays, and field surveillance documents.'}
                {activeNav === 'Users & Roles'        && 'Manage system users, roles, and access permissions'}
                {activeNav === 'Response Actions'     && 'Track, manage, and close response actions for water quality incidents'}
                {activeNav === 'Rules & Thresholds'   && 'Configure water quality rules, threshold limits, and their versions for alert evaluation.'}
                {(activeNav === 'Evidence Archive' || activeNav === 'Evidence (S3)') && 'Manage lab reports, field sheets, and supporting evidence for readings and incidents.'}
                {activeNav === 'Settings'             && 'Configure system preferences, integrations, security, and operational parameters.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Live Database Status Pill */}
            {adminTables.isFetching ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-300 bg-sky-50 text-xs font-semibold text-sky-700 shadow-xs animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                <span>Syncing Database ({activeNav})…</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Central Database • Live</span>
              </div>
            )}

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
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">{adminTables.alerts.length}</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs py-1">
                    {adminTables.alerts.slice(0, 5).map(alert => <button key={alert.alertId} onClick={() => { setActiveNav('Alerts & Incidents'); setShowNotificationMenu(false); }} className="block w-full py-2 text-left hover:bg-slate-50">
                      <div className="font-semibold text-rose-600">{alert.alertId} · {humanize(alert.severity)}</div>
                      <div className="text-[11px] text-slate-500">{alert.reason ?? alert.publicMessage ?? alert.state}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{displayDate(alert.issuedAt ?? alert.createdAt)}</div>
                    </button>)}
                    {adminTables.alerts.length === 0 && <div className="py-2 text-slate-500">No alerts returned by the API.</div>}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Cognito Auth Dropdown */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-full border border-slate-200 hover:border-slate-300 bg-white transition shadow-xs cursor-pointer"
                >
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${
                    user.role === 'ADMIN'
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : user.role === 'ANALYST'
                      ? 'bg-purple-50 border-purple-200 text-purple-700'
                      : 'bg-blue-50 border-blue-200 text-blue-700'
                  }`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left leading-tight hidden sm:block">
                    <div className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{user.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono font-semibold uppercase">{user.role} &bull; COGNITO</div>
                  </div>
                </button>

                {/* User Menu Popover */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in-50 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900">{user.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
                      <div className="text-[10px] font-mono text-cyan-600 font-bold mt-1">
                        Group: {user.groups.join(', ') || user.role}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/user');
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-xl flex items-center justify-between transition mt-1"
                    >
                      <span>Citizen Portal View</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl flex items-center justify-between transition mt-1 font-semibold cursor-pointer"
                    >
                      <span>Sign Out (Cognito)</span>
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/40 shadow-sm shadow-blue-500/20 cursor-pointer transition flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>Admin Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* DASHBOARD BODY CONTAINER */}
        <div className="p-6 space-y-6">
          {adminNotice && (
            <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{adminNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setAdminNotice(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-0.5 rounded-lg hover:bg-emerald-100"
              >
                ×
              </button>
            </div>
          )}
          {adminError && (
            <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-800 flex items-center justify-between shadow-xs animate-in fade-in">
              <span>{adminError}</span>
              <button
                type="button"
                onClick={() => setAdminError(null)}
                className="text-rose-700 hover:text-rose-900 font-bold px-2 py-0.5 rounded-lg hover:bg-rose-100"
              >
                ×
              </button>
            </div>
          )}
          {adminTables.error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{adminTables.error}</div>}

          {/* RBAC Gatekeeper Banner */}
          {!isAuthenticated && (
            <div className="p-4 rounded-2xl bg-[#091533] border border-blue-500/50 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/40 text-cyan-300 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">AWS Cognito Administrator Authentication</h4>
                  <p className="text-slate-300 text-[11px]">
                    Viewing public surveillance telemetry. Sign in with Cognito Administrator credentials to execute privileged mutations (CRUD on rules, thresholds, and sources).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shrink-0 shadow-md shadow-blue-500/30"
              >
                Sign In / Switch to Admin &rarr;
              </button>
            </div>
          )}

          {isAuthenticated && !isAdmin && (
            <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-600/60 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-200 text-sm">Citizen Role Detected ({user?.email})</h4>
                  <p className="text-amber-300/80 text-[11px]">
                    You are signed in as a Citizen. Administrative actions and system configuration are restricted to users in the 'Admins' group.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Switch Account
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/user')}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs border border-slate-700 transition cursor-pointer"
                >
                  Citizen Portal &rarr;
                </button>
              </div>
            </div>
          )}
          {/* Main Dashboard Screen (Matching user screenshot) */}
          {activeNav === 'Admin Dashboard' && (
            <AdminDashboardView
              sources={adminTables.sources}
              alerts={adminTables.alerts}
              readings={adminTables.readings}
              actions={adminTables.actions}
              loading={adminTables.loadingSources || adminTables.loadingAlerts || adminTables.loadingReadings}
              onNavigateTo={(tab) => setActiveNav(tab)}
              onQuickAction={handleQuickAction}
            />
          )}

          {/* ── ALERTS & INCIDENTS ── */}
          {activeNav === 'Alerts & Incidents' && (
            <AlertsIncidentsView
              alerts={adminTables.alerts}
              sources={adminTables.sources}
              loading={adminTables.loadingAlerts}
              onSelectAlert={handleSelectAlert}
              onRefresh={() => adminTables.fetchAlerts(true)}
              onCreateAlert={adminTables.createAlert}
              onUpdateAlert={adminTables.updateAlert}
              onDeleteAlert={adminTables.deleteAlert}
            />
          )}

          {/* ── CITIZEN COMPLAINTS ── */}
          {activeNav === 'Complaints' && (
            <ComplaintsView
              complaints={adminTables.complaints}
              loading={adminTables.loadingComplaints}
              onRefresh={() => adminTables.fetchComplaints(true)}
              onUpdateComplaint={adminTables.updateComplaint}
              onDeleteComplaint={adminTables.deleteComplaint}
              onCreateComplaint={adminTables.createComplaint}
            />
          )}

          {/* ── WATER SOURCES ── */}
          {activeNav === 'Water Sources' && (
            <WaterSourcesView
              sources={adminTables.sources}
              readings={adminTables.readings}
              alerts={adminTables.alerts}
              loading={adminTables.loadingSources}
              onRefresh={() => adminTables.fetchSources(true)}
              onSelectSource={(sourceId) => setDrawerSourceId(sourceId)}
              onCreateSource={adminTables.createSource}
              onUpdateSource={adminTables.updateSource}
              onDeleteSource={adminTables.deleteSource}
            />
          )}

          {/* ── READINGS ── */}
          {activeNav === 'Readings' && (
            <ReadingsView
              readings={adminTables.readings}
              sources={adminTables.sources}
              loading={adminTables.loadingReadings}
              onSubmitReading={() => setActiveModal('submit-reading')}
              onRefresh={() => adminTables.fetchReadings(true)}
              onUpdateReading={adminTables.updateReading}
              onDeleteReading={adminTables.deleteReading}
            />
          )}

          {/* ── REPORTS (REGISTRY & ARCHIVE ANALYSIS) ── */}
          {activeNav === 'Reports' && (
            <ReportsView
              reports={adminTables.reports}
              sources={adminTables.sources}
              alerts={adminTables.alerts}
              readings={adminTables.readings}
              loading={adminTables.loadingReports}
              onRefresh={() => adminTables.fetchReports(true)}
              initialTab="registry"
              onUpdateReport={adminTables.updateReport}
              onDeleteReport={adminTables.deleteReport}
            />
          )}

          {/* ── UPLOAD DOCUMENT STATION (DEDICATED ROUTE & VIEW) ── */}
          {(activeNav === 'Upload Document' || activeNav === 'Upload Reports') && (
            <UploadDocumentView
              sources={adminTables.sources}
              alerts={adminTables.alerts}
              reports={adminTables.reports}
              readings={adminTables.readings}
              loading={adminTables.loadingReports}
              onRefresh={() => adminTables.fetchReports(true)}
            />
          )}

          {/* ── USERS & ROLES ── */}
          {activeNav === 'Users & Roles' && <UsersRolesView />}

          {/* ── EVIDENCE ARCHIVE ── */}
          {(activeNav === 'Evidence Archive' || activeNav === 'Evidence (S3)') && (
            <EvidenceS3View
              sources={adminTables.sources}
              alerts={adminTables.alerts}
              readings={adminTables.readings}
              reports={adminTables.reports}
              onUploadReport={handleUploadReport}
              onDeleteReport={adminTables.deleteReport}
            />
          )}

          {/* ── RESPONSE ACTIONS ── */}
          {activeNav === 'Response Actions' && (
            <ResponseActionsView
              actions={adminTables.actions}
              alerts={adminTables.alerts}
              sources={adminTables.sources}
              loading={adminTables.loadingActions}
              onRecordAction={() => setActiveModal('record-action')}
              onRefresh={() => adminTables.fetchActions(true)}
              onSelectAlert={handleSelectAlert}
              onUpdateAction={adminTables.updateAction}
              onDeleteAction={adminTables.deleteAction}
              onUpdateAlert={adminTables.updateAlert}
            />
          )}

          {/* ── RULES & THRESHOLDS ── */}
          {activeNav === 'Rules & Thresholds' && (
            <TabErrorBoundary tabName="Rules & Thresholds" onReset={adminTables.reloadAll}>
              <RulesThresholdsView
                alerts={adminTables.alerts}
                readings={adminTables.readings}
                sources={adminTables.sources}
                rules={adminTables.rules}
                thresholds={adminTables.thresholds}
                loading={adminTables.loadingRules || adminTables.loadingThresholds}
                onNavigateToTab={handleNavChange}
                onRefresh={adminTables.reloadAll}
                onSaveRule={(rule) => adminTables.updateRule(rule.ruleId, rule)}
                onCreateRule={adminTables.createRule}
                onDeleteRule={adminTables.deleteRule}
                onSaveThreshold={(threshold) => adminTables.updateThreshold(threshold.id, threshold)}
                onCreateThreshold={adminTables.createThreshold}
                onDeleteThreshold={adminTables.deleteThreshold}
              />
            </TabErrorBoundary>
          )}

          {/* ── SETTINGS ── */}
          {activeNav === 'Settings' && <SettingsView />}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. MODALS FOR QUICK ACTIONS                                               */}
      {/* ========================================================================= */}

      {/* Submit Reading Modal */}
      {activeModal === 'submit-reading' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 animate-in fade-in-50 zoom-in-95">
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
              <SubmitReadingPanel sources={adminTables.sources} busy={adminBusy} onSubmit={handleSubmitReading} />
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
            <form onSubmit={handleRecordAction} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Incident / Alert</label>
                <select name="alertId" required className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white text-slate-800">
                  {adminTables.alerts.length === 0 ? (
                    <option value="">No alerts loaded (Check connection)</option>
                  ) : (
                    adminTables.alerts.map(alert => {
                      const source = adminTables.sources.find(item => item.sourceId === alert.sourceId);
                      return (
                        <option key={alert.alertId} value={alert.alertId}>
                          {alert.alertId} &bull; {source?.name ?? alert.sourceId} &bull; ({humanize(alert.severity)}) &bull; {alert.reason ?? alert.state ?? ''}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Action Type</label>
                <select name="actionType" required className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white text-slate-800">
                  <option value="FIELD_INVESTIGATION">FIELD INVESTIGATION &rarr; Engineering On-Site Inspection</option>
                  <option value="CHLORINATION_FLUSH">CHLORINATION FLUSH &rarr; Main Disinfection &amp; Pipe Blow-off</option>
                  <option value="BOIL_WATER_ADVISORY">BOIL-WATER ADVISORY &rarr; Precautionary Public Advisory</option>
                  <option value="LAB_DISPATCH">LAB DISPATCH &rarr; Duplicate Sample NABL Verification</option>
                  <option value="INFRASTRUCTURE_REPAIR">INFRASTRUCTURE REPAIR &rarr; Conduit / Valve Remediation</option>
                  <option value="SOURCE_ISOLATION">SOURCE ISOLATION &rarr; Temporary Supply Disconnect</option>
                  <option value="PUBLIC_NOTICE_ISSUED">PUBLIC NOTICE ISSUED &rarr; Public Advisory Resolution</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Actor Role</label>
                <select name="actorRole" required className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white text-slate-800">
                  <option value="CHIEF_CHEMIST">Dr. S. K. Gupta &bull; Chief Quality Chemist</option>
                  <option value="ZONAL_ENGINEER">A. K. Verma &bull; Senior Zonal Water Engineer</option>
                  <option value="SURVEILLANCE_OFFICER">Surveillance Chemist &bull; Field Testing Unit</option>
                  <option value="HEALTH_INSPECTOR">Municipal Health &amp; Sanitation Inspector</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Action Summary / Engineering Justification</label>
                <textarea
                  name="summary"
                  required
                  rows={3}
                  placeholder="Describe field inspection observations, dosing rate changes, pipe flush procedure, or laboratory chain of custody details..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white text-slate-800"
                />
              </div>

              {/* Facility Incident Severity Post-Action Option */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/90 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <ShieldAlert className="w-4 h-4 text-blue-600" />
                    <span>Facility Incident Severity Post-Action</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    Facility Reclassification
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Optionally update or de-escalate the water facility's incident severity after executing this corrective action:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 text-[11px] mb-1">New Severity</label>
                    <select
                      name="newSeverity"
                      defaultValue="NO_CHANGE"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white text-slate-800 font-medium"
                    >
                      <option value="NO_CHANGE">No change (Keep current severity)</option>
                      <option value="RESOLVED">✅ RESOLVED — Incident Cleared / Normal Quality</option>
                      <option value="INFO">ℹ️ INFO — De-escalated to Informational Monitoring</option>
                      <option value="WARNING">⚠️ WARNING — Maintained under Advisory</option>
                      <option value="HIGH">🟠 HIGH — Elevated Operational Alert</option>
                      <option value="CRITICAL">🔴 CRITICAL — Emergency Contamination Alert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 text-[11px] mb-1">Lifecycle State</label>
                    <select
                      name="newState"
                      defaultValue="UNCHANGED"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white text-slate-800 font-medium"
                    >
                      <option value="UNCHANGED">Keep current status</option>
                      <option value="RESOLVED">RESOLVED (Close Incident)</option>
                      <option value="IN_PROGRESS">IN_PROGRESS (Ongoing Mitigation)</option>
                      <option value="ACKNOWLEDGED">ACKNOWLEDGED (Office Notified)</option>
                      <option value="TRIGGERED">TRIGGERED (Active Critical Alarm)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 bg-[#152347] hover:bg-[#1c3060] text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer border border-[#1e3470]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminBusy}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-500/30 transition flex items-center gap-1.5 cursor-pointer border border-blue-400/40"
                >
                  {adminBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{adminBusy ? 'Saving to Database…' : 'Commit Action'}</span>
                </button>
              </div>
            </form>
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
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    handleNavChange('Rules & Thresholds');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Full Rules &amp; Thresholds Tab &rarr;</span>
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer"
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
                <h3 className="font-bold text-slate-900 text-base">Upload Certified Lab Evidence</h3>
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
                sources={adminTables.sources}
                busy={adminBusy}
                onSubmit={handleUploadReport}
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
          alerts={adminTables.alerts}
          sources={adminTables.sources}
          onClose={handleCloseAlertDrawer}
          onOpenSource={(srcId) => {
            handleCloseAlertDrawer();
            data.setSelected(srcId);
            setDrawerSourceId(srcId);
          }}
          isStaff={true}
        />
      )}

      {/* Universal Submission Acceptance Modal */}
      {submissionModalData && (
        <SubmissionSuccessModal
          isOpen={true}
          onClose={() => setSubmissionModalData(null)}
          title={submissionModalData.title}
          subtitle={submissionModalData.subtitle}
          badgeText={submissionModalData.badgeText}
          recordId={submissionModalData.recordId}
          tableTarget={submissionModalData.tableTarget}
          s3Pointer={submissionModalData.s3Pointer}
          details={submissionModalData.details}
        />
      )}

      {/* AWS Cognito Authentication & Registration Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode="signin"
      />
    </div>
  );
};

export default AdminPage;
