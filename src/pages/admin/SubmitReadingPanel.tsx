import type { FC, FormEvent } from 'react';
import type { Source } from '../../types/water';
import { DEMO_SOURCES } from '../../data/demoDataset';

interface Props {
  sources: Source[];
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const SubmitReadingPanel: FC<Props> = ({ sources, busy, onSubmit }) => {
  const availableSources = sources.length > 0 ? sources : DEMO_SOURCES;
  const nowString = new Date().toISOString().slice(0, 16);

  return (
    <div className="portal-columns font-sans">
      <section className="portal-panel">
        <div className="panel-heading">
          <div>
            <div className="panel-eyebrow">FIELD TELEMETRY INGESTION</div>
            <h2>Submit a water quality reading</h2>
          </div>
          <span className="demo-pill">SURVEILLANCE INGESTION</span>
        </div>
        <form className="portal-form" onSubmit={onSubmit}>
          <label>
            Water Source
            <select name="sourceId" required className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-xs">
              {availableSources.map(s => (
                <option key={s.sourceId} value={s.sourceId}>
                  {s.sourceId} &bull; {s.name || s.sourceId} ({s.locality || s.district || 'Gwalior'})
                </option>
              ))}
            </select>
          </label>
          <div className="form-pair">
            <label>
              Sample Collected At
              <input
                type="datetime-local"
                name="collectedAt"
                defaultValue={nowString}
                required
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-xs"
              />
            </label>
            <label>
              Test Method
              <select name="method" required className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-xs">
                <option value="FIELD_SCREENING">Digital Multiparameter Probe</option>
                <option value="LAB_TEST">NABL Certified Laboratory Test</option>
                <option value="PORTABLE_COLORIMETER">Portable Colorimeter</option>
                <option value="RAPID_TEST_KIT">Field Rapid Screening Kit</option>
              </select>
            </label>
          </div>
          <div className="form-pair">
            <label>
              pH Level
              <input
                type="number"
                name="pH"
                step="0.01"
                min="0"
                max="14"
                placeholder="e.g. 7.2"
                required
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-xs"
              />
            </label>
            <label>
              Turbidity (NTU)
              <input
                type="number"
                name="turbidity"
                step="0.01"
                min="0"
                placeholder="e.g. 0.85"
                required
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-xs"
              />
            </label>
            <label>
              TDS (mg/L)
              <input
                type="number"
                name="TDS"
                step="0.1"
                min="0"
                placeholder="e.g. 240"
                required
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-xs"
              />
            </label>
          </div>
          <p className="form-help text-[11px] text-slate-500">
            Readings are evaluated against BIS IS 10500 standards (pH 6.5–8.5, turbidity &le; 1 NTU, TDS &le; 500 mg/L). Anomalies trigger immediate screening alerts.
          </p>
          <button
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/30 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 border border-blue-400/40"
            type="submit"
            disabled={busy}
          >
            <span>{busy ? 'Recording telemetry…' : 'Submit Reading to Database →'}</span>
          </button>
        </form>
      </section>
      <section className="portal-panel">
        <div className="panel-eyebrow">INGESTION PIPELINE</div>
        <h2>Verification Pipeline Contract</h2>
        <p className="muted-copy text-xs text-slate-600 leading-relaxed">
          The ingestion API calculates server-side timestamps (`receivedAt`), assigns identifier keys (`sourceId`), and writes the reading record directly to the municipal water quality database.
        </p>
        <div className="trust-note text-xs text-slate-500 mt-4 border-t pt-3">
          If pH or turbidity exceeds permissible boundaries, the system automatically creates an incident record and dispatches emergency notifications to on-duty operators.
        </div>
      </section>
    </div>
  );
};

export default SubmitReadingPanel;
