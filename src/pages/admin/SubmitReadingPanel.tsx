import type { FC, FormEvent } from 'react';
import type { Source } from '../../types/water';

const SubmitReadingPanel: FC<{ sources: Source[]; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }> = ({ sources, busy, onSubmit }) => (
  <div className="portal-columns">
    <section className="portal-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-eyebrow">FIELD INGESTION</div>
          <h2>Submit a measurement</h2>
        </div>
        <span className="demo-pill">SCREENING</span>
      </div>
      <form className="portal-form" onSubmit={onSubmit}>
        <label>
          Water source
          <select name="sourceId" required>
            {sources.map(s => (
              <option key={s.sourceId} value={s.sourceId}>
                {s.name || s.sourceId}
              </option>
            ))}
          </select>
        </label>
        <div className="form-pair">
          <label>
            Sample collected at
            <input type="datetime-local" name="collectedAt" required />
          </label>
          <label>
            Test method
            <input name="method" placeholder="Field kit / probe" required />
          </label>
        </div>
        <div className="form-pair">
          {[
            ['pH', 'pH'],
            ['turbidity', 'Turbidity (NTU)'],
            ['TDS', 'TDS (mg/L)'],
          ].map(([name, label]) => (
            <label key={name}>
              {label}
              <input type="number" name={name} step="any" placeholder="Optional" />
            </label>
          ))}
        </div>
        <p className="form-help">Values are evaluated by the Lambda for pH (6.5–8.5) and turbidity (&gt;5 NTU). TDS is stored but not evaluated by this function.</p>
        <button className="primary-button" disabled={busy || !sources.length}>
          {busy ? 'Submitting…' : 'Submit reading →'}
        </button>
      </form>
    </section>
    <section className="portal-panel">
      <div className="panel-eyebrow">INGESTION CONTRACT</div>
      <h2>Timestamp and verification</h2>
      <p className="muted-copy">
        The API adds receivedAt server-side. This form sends collectedAt, method, screening status, source ID, parameter values and units. API Gateway/Lambda must
        enforce staff authentication; the provided function does not inspect JWT claims.
      </p>
      <div className="trust-note">A successful response confirms acceptance, not source calibration, lab verification, or a health determination.</div>
    </section>
  </div>
);

export default SubmitReadingPanel;
