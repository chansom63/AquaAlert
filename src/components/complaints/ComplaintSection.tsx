import type { FC, FormEvent } from 'react';
import { GWALIOR_WARDS_66 } from '../../data/gwaliorWardsData.js';
import type { ComplaintRecord } from '../../types/water';
import {
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Phone,
  ShieldAlert,
  User,
  Users,
  XCircle,
} from 'lucide-react';

export interface ComplaintSectionProps {
  reports: ComplaintRecord[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  busy?: boolean;
}

const getStatusBadge = (status?: string) => {
  switch (status?.toUpperCase()) {
    case 'RESOLVED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600/50">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>RESOLVED</span>
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/50">
          <Clock className="w-2.5 h-2.5" />
          <span>IN PROGRESS</span>
        </span>
      );
    case 'ASSIGNED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/50">
          <Users className="w-2.5 h-2.5" />
          <span>ASSIGNED</span>
        </span>
      );
    case 'TRIAGED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-500/50">
          <span>TRIAGED</span>
        </span>
      );
    case 'REJECTED':
    case 'DISMISSED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-600/50">
          <XCircle className="w-2.5 h-2.5" />
          <span>DISMISSED</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600/50">
          <Clock className="w-2.5 h-2.5" />
          <span>PENDING REVIEW</span>
        </span>
      );
  }
};

const getPriorityBadge = (priority?: string) => {
  switch (priority?.toUpperCase()) {
    case 'CRITICAL':
      return <span className="text-[10px] font-black text-rose-400 font-mono">⚡ CRITICAL</span>;
    case 'HIGH':
      return <span className="text-[10px] font-bold text-amber-400 font-mono">▲ HIGH</span>;
    case 'LOW':
      return <span className="text-[10px] font-semibold text-slate-400 font-mono">▽ LOW</span>;
    default:
      return <span className="text-[10px] font-semibold text-sky-400 font-mono">● MEDIUM</span>;
  }
};

const ComplaintSection: FC<ComplaintSectionProps> = ({ reports, onSubmit, busy = false }) => (
  <div className="portal-columns complaint-layout">
    {/* Left Column: Complaint Submission Form */}
    <section className="portal-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-eyebrow">CITIZEN GRIEVANCE &amp; MUNICIPAL SURVEILLANCE · GWALIOR</div>
          <h2>Lodge a municipal water complaint</h2>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-mono shadow-xs">
          LIVE • CITIZEN GRIEVANCE DESK
        </span>
      </div>
      <p className="muted-copy">
        Submit complaints directly to the Gwalior Municipal Corporation surveillance desk. Submissions are instantly stored in the dedicated complaints registry and evidence bucket, notifying ward engineers for immediate field inspection.
      </p>

      <form className="portal-form" onSubmit={onSubmit}>
        {/* Ward & Category */}
        <div className="form-pair">
          <label htmlFor="complaint-ward">
            Administrative Ward
            <select id="complaint-ward" name="wardNumber" required defaultValue="14">
              {GWALIOR_WARDS_66.map(ward => (
                <option key={ward.wardNumber} value={ward.wardNumber}>
                  Ward {String(ward.wardNumber).padStart(2, '0')} · {ward.name.split(' - ')[1]}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="complaint-category">
            Issue Category
            <select id="complaint-category" name="category" required defaultValue="Water quality concern">
              <option>Water quality concern</option>
              <option>Turbid / Muddy water</option>
              <option>Chemical odor / metallic taste</option>
              <option>Sewage cross-contamination concern</option>
              <option>Pipeline burst / Leakage</option>
              <option>No water supply</option>
              <option>Low water pressure</option>
              <option>Saline / High TDS taste</option>
              <option>Other water issue</option>
            </select>
          </label>
        </div>

        {/* Citizen Contact (Optional) */}
        <div className="form-pair">
          <label htmlFor="complaint-name">
            Citizen Full Name (Optional)
            <input
              id="complaint-name"
              name="citizenName"
              type="text"
              placeholder="e.g. Ramesh Chandra Sharma"
            />
          </label>
          <label htmlFor="complaint-phone">
            Mobile Number (For SMS updates)
            <input
              id="complaint-phone"
              name="citizenPhone"
              type="tel"
              placeholder="e.g. +91 98261 XXXXX"
            />
          </label>
        </div>

        {/* Complaint Description */}
        <label htmlFor="complaint-details">
          Describe the Water Issue
          <textarea
            id="complaint-details"
            name="details"
            required
            minLength={12}
            maxLength={600}
            placeholder="Include specific street address/landmark, when the issue was observed, and any physical characteristics (discoloration, smell, suspended silt, pressure level)."
          />
        </label>

        {/* Photo Upload with Dedicated S3 Bucket note */}
        <label htmlFor="complaint-photo">
          Attach Photo or Video Evidence (Optional)
          <input id="complaint-photo" name="photo" type="file" accept="image/*" />
        </label>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Camera className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Photos are encrypted and uploaded to the dedicated <code>waterq-dev-complaints-evidence</code> S3 bucket.</span>
        </div>

        <button
          className="primary-button cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 font-bold"
          type="submit"
          disabled={busy}
        >
          {busy ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Transmitting to Complaints Table &amp; Evidence Storage…</span>
            </>
          ) : (
            <span>Submit Citizen Complaint &rarr;</span>
          )}
        </button>
      </form>

      <div className="complaint-preview-notice bg-[#091533] border border-[#1e3470] rounded-xl p-3.5 mt-4 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
          <strong className="text-cyan-300 font-bold">Official Statutory Grievance Handling</strong>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          Complaints are persisted in the central GMC DynamoDB <strong>Complaints</strong> table and monitored by municipal surveillance engineers and executive public health officers.
        </p>
      </div>
    </section>

    {/* Right Column: Emergency Contacts & Logged Complaints Feed */}
    <aside className="portal-panel complaint-support">
      <div className="panel-eyebrow">NEED URGENT ASSISTANCE?</div>
      <h2>Municipal 24x7 Water Emergency Helpline</h2>
      <p className="muted-copy">
        For active acute contamination, heavy sewage flooding, or catastrophic pipeline rupture, contact the GMC control room directly.
      </p>
      <a className="complaint-hotline" href="tel:18002330195">
        <Phone className="w-4 h-4 text-emerald-400" />
        <div className="flex flex-col text-left">
          <span className="text-[11px] text-slate-400">Call Toll-Free Control Room</span>
          <strong className="text-emerald-300 text-sm tracking-wide">1800-233-0195</strong>
        </div>
      </a>

      {/* Logged Complaints Header */}
      <div className="complaint-history-heading">
        <div>
          <div className="panel-eyebrow">COMPLAINTS REGISTRY</div>
          <h3>Logged Citizen Complaints</h3>
        </div>
        <span className="font-mono text-cyan-300 font-bold bg-cyan-950/80 border border-cyan-700/60 px-2 py-0.5 rounded-full text-xs">
          {reports.length}
        </span>
      </div>

      {reports.length ? (
        <div className="complaint-history space-y-3">
          {reports.map(report => (
            <article
              className="complaint-item bg-[#091533] border border-[#1e3470] hover:border-cyan-500/40 p-3.5 rounded-xl transition shadow-xs"
              key={report.reference || report.complaintId}
            >
              <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                <b className="text-white font-bold truncate">{report.category}</b>
                <span className="text-cyan-300 font-mono text-[11px] shrink-0 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
                  Ward {String(report.wardNumber).padStart(2, '0')}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
                <span className="text-cyan-400 font-semibold">{report.reference || report.complaintId}</span>
                {getPriorityBadge(report.priority)}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-2">
                {report.details}
              </p>

              {/* Citizen info if present */}
              {report.citizenName && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>Reported by: <strong className="text-slate-300">{report.citizenName}</strong></span>
                  {report.citizenPhone && <span className="text-slate-500 font-mono">({report.citizenPhone})</span>}
                </div>
              )}

              {/* Photo Evidence Attached Indicator */}
              {(report.photoName || report.s3Key) && (
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-purple-950/40 border border-purple-800/30 text-[11px] text-purple-300 mb-2">
                  <Camera className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">Evidence: {report.photoName || 'attachment.jpg'}</span>
                  {report.photoUrl && (
                    <a
                      href={report.photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-0.5 text-[10px] font-semibold"
                    >
                      <span>View</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Assigned Engineer / Resolution Note */}
              {report.assignedTo && report.assignedTo !== 'Unassigned' && (
                <div className="text-[11px] text-indigo-300 bg-indigo-950/40 border border-indigo-800/30 rounded p-1.5 mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3 shrink-0 text-indigo-400" />
                  <span>Assigned: <strong>{report.assignedTo}</strong></span>
                </div>
              )}

              {report.resolutionNotes && (
                <div className="text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-800/30 rounded p-1.5 mb-2">
                  <strong>Resolution:</strong> {report.resolutionNotes}
                </div>
              )}

              {/* Bottom Footer Strip */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1c295c] text-[10px] text-slate-400">
                <span>{new Date(report.createdAt).toLocaleString()}</span>
                {getStatusBadge(report.status)}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state complaint-empty text-xs text-slate-400 p-6 border border-dashed border-[#1e3470] rounded-xl text-center">
          No complaints logged yet. Submitted issues will appear in this audit list.
        </div>
      )}
    </aside>
  </div>
);

export default ComplaintSection;
