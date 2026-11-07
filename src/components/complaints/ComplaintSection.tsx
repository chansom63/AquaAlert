import type { FC, FormEvent } from 'react';
import { GWALIOR_WARDS_66 } from '../../data/gwaliorWardsData.js';
import type { ComplaintPreview } from '../../types/water';

export interface ComplaintSectionProps {
  reports: ComplaintPreview[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  busy?: boolean;
}

const ComplaintSection: FC<ComplaintSectionProps> = ({ reports, onSubmit, busy = false }) => (
  <div className="portal-columns complaint-layout">
    <section className="portal-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-eyebrow">CITIZEN GRIEVANCE &amp; SURVEILLANCE · GWALIOR</div>
          <h2>Report a municipal water issue</h2>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-mono">
          LIVE • MUNICIPAL GRIEVANCE DESK
        </span>
      </div>
      <p className="muted-copy">
        Submit citizen notices directly to the Gwalior Municipal Corporation surveillance desk. Detail the exact location, timing, and nature of the water quality breach or disruption.
      </p>
      <form className="portal-form" onSubmit={onSubmit}>
        <div className="form-pair">
          <label htmlFor="complaint-ward">
            Administrative ward
            <select id="complaint-ward" name="wardNumber" required defaultValue="14">
              {GWALIOR_WARDS_66.map(ward => (
                <option key={ward.wardNumber} value={ward.wardNumber}>
                  Ward {String(ward.wardNumber).padStart(2, '0')} · {ward.name.split(' - ')[1]}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="complaint-category">
            Issue type
            <select id="complaint-category" name="category" required defaultValue="Water quality concern">
              <option>Water quality concern</option>
              <option>No water supply</option>
              <option>Low water pressure</option>
              <option>Leak or damaged pipe</option>
              <option>Turbidity / discoloration</option>
              <option>Chemical odor / metallic taste</option>
              <option>Other water issue</option>
            </select>
          </label>
        </div>
        <label htmlFor="complaint-details">
          Describe the issue
          <textarea
            id="complaint-details"
            name="details"
            required
            minLength={12}
            maxLength={600}
            placeholder="Include specific street address/landmark, when the issue was observed, and any physical characteristics (color, smell, particulate matter)."
          />
        </label>
        <label htmlFor="complaint-photo">
          Photo of the water or infrastructure (optional)
          <input id="complaint-photo" name="photo" type="file" accept="image/*" />
        </label>
        <small className="form-help">Images up to 5 MB are automatically hashed and archived to private S3 evidence storage.</small>
        <small className="form-help">Please don’t include passwords, payment details, or other confidential credentials.</small>
        <button
          className="primary-button cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          type="submit"
          disabled={busy}
        >
          {busy ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Transmitting to Municipal Desk…</span>
            </>
          ) : (
            <span>Submit Water Issue Report &rarr;</span>
          )}
        </button>
      </form>
      <div className="complaint-preview-notice bg-[#091533] border border-[#1e3470] rounded-xl p-3 mt-4 text-xs">
        <strong className="text-cyan-300 font-bold block mb-1">Direct Surveillance Dispatch</strong>
        <span className="text-slate-300">
          Submissions are recorded to the central municipal database (LabReports &amp; Incident Ledger) and dispatched to ward surveillance engineers for prompt inspection.
        </span>
      </div>
    </section>

    <aside className="portal-panel complaint-support">
      <div className="panel-eyebrow">NEED URGENT ASSISTANCE?</div>
      <h2>Municipal water emergency helpline</h2>
      <p className="muted-copy">For active contamination or total municipal supply pipeline failure, contact the GMC control room directly.</p>
      <a className="complaint-hotline" href="tel:18002330195">
        <span>Call the 24x7 control room</span>
        <strong>1800-233-0195</strong>
      </a>
      <div className="complaint-history-heading">
        <div>
          <div className="panel-eyebrow">MUNICIPAL LEDGER</div>
          <h3>Logged citizen reports</h3>
        </div>
        <span className="font-mono text-cyan-300 font-bold">{reports.length}</span>
      </div>
      {reports.length ? (
        <div className="complaint-history space-y-2.5">
          {reports.map(report => (
            <article className="complaint-item bg-[#091533] border border-[#1e3470] p-3 rounded-xl" key={report.reference}>
              <div className="flex items-center justify-between text-xs mb-1">
                <b className="text-white font-bold">{report.category}</b>
                <span className="text-cyan-300 font-mono text-[11px]">
                  Ward {String(report.wardNumber).padStart(2, '0')}
                </span>
              </div>
              <strong className="text-[11px] font-mono text-slate-400 block mb-1">{report.reference}</strong>
              <p className="text-xs text-slate-300 leading-relaxed">{report.details}</p>
              {report.photoName && (
                <small className="text-[11px] text-purple-400 font-mono block mt-1">
                  Evidence attached: {report.photoName}
                </small>
              )}
              <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-[#1c295c] text-[10px] text-slate-400">
                <span>{new Date(report.createdAt).toLocaleString()}</span>
                <span className="text-emerald-400 font-bold">SENT TO GMC</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state complaint-empty text-xs text-slate-400 p-4 border border-dashed border-[#1e3470] rounded-xl text-center">
          No complaints logged yet. Submitted issues will appear in this audit list.
        </div>
      )}
    </aside>
  </div>
);

export default ComplaintSection;
