import type { FC, FormEvent } from 'react';
import { GWALIOR_WARDS_66 } from '../../data/gwaliorWardsData.js';
import type { ComplaintPreview } from '../../types/water';

const ComplaintSection: FC<{ reports: ComplaintPreview[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }> = ({ reports, onSubmit }) => (
  <div className="portal-columns complaint-layout">
    <section className="portal-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-eyebrow">CITIZEN SUPPORT · GWALIOR</div>
          <h2>Report a water issue</h2>
        </div>
        <span className="demo-pill">PREVIEW</span>
      </div>
      <p className="muted-copy">Tell us where the issue is and what happened. Add clear details so the right ward can be identified.</p>
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
              <option>Other water issue</option>
            </select>
          </label>
        </div>
        <label htmlFor="complaint-details">
          Describe the issue
          <textarea id="complaint-details" name="details" required minLength={12} maxLength={600} placeholder="Include the location, when it started, and what you noticed." />
        </label>
        <label htmlFor="complaint-photo">
          Photo of the water (optional)
          <input id="complaint-photo" name="photo" type="file" accept="image/*" />
        </label>
        <small className="form-help">Choose a photo up to 5 MB. It will only be attached to this local preview.</small>
        <small className="form-help">Please don’t include passwords, payment details, or other sensitive information.</small>
        <button className="primary-button" type="submit">
          Create preview report →
        </button>
      </form>
      <div className="complaint-preview-notice">
        <strong>Preview only</strong>
        <span>Reports created here stay in this page session and are not sent to Gwalior Municipal Corporation.</span>
      </div>
    </section>
    <aside className="portal-panel complaint-support">
      <div className="panel-eyebrow">NEED HELP NOW?</div>
      <h2>Municipal water helpline</h2>
      <p className="muted-copy">For urgent supply or water-quality concerns, contact the municipal helpline directly.</p>
      <a className="complaint-hotline" href="tel:18002330195">
        <span>Call the helpline</span>
        <strong>1800-233-0195</strong>
      </a>
      <div className="complaint-history-heading">
        <div>
          <div className="panel-eyebrow">THIS SESSION</div>
          <h3>Preview reports</h3>
        </div>
        <span>{reports.length}</span>
      </div>
      {reports.length ? (
        <div className="complaint-history">
          {reports.map(report => (
            <article className="complaint-item" key={report.reference}>
              <div>
                <b>{report.category}</b>
                <span>
                  Ward {String(report.wardNumber).padStart(2, '0')} · {new Date(report.createdAt).toLocaleString()}
                </span>
              </div>
              <strong>{report.reference}</strong>
              <p>{report.details}</p>
              {report.photoName && <small>Photo attached: {report.photoName}</small>}
              <small>Local preview · not delivered</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state complaint-empty">Your preview reports will appear here.</div>
      )}
    </aside>
  </div>
);

export default ComplaintSection;
