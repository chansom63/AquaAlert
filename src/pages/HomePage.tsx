import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import CinematicHero from '../components/CinematicHero';
import WaterIllustration from '../components/illustrations/WaterIllustration';
import CommonFooter from '../components/layout/CommonFooter';
import LandingDetails from '../components/landing/LandingDetails';

const HomePage: FC = () => {
  const navigate = useNavigate();

  return (
    <div className="app">
      <CinematicHero />
      <section className="water-section" id="water-testing">
        <div className="water-shell">
          <header className="water-heading">
            <span className="portal-kicker">TEST · UNDERSTAND · TAKE ACTION</span>
            <h2>
              Water testing,
              <br />
              <em>alerts you can understand.</em>
            </h2>
            <p>From sample to public update, see the essential water quality information in one place.</p>
          </header>
          <div className="water-grid">
            <article className="water-card water-card-feature">
              <WaterIllustration type="test" />
              <h3>Test Results</h3>
              <p>See measured values, units, and when the sample was collected.</p>
              <button onClick={() => navigate('/user')}>
                Explore sources <b>→</b>
              </button>
            </article>
            <article className="water-card">
              <WaterIllustration type="alert" />
              <h3>Clear Alerts</h3>
              <p>Understand why a screening result was flagged and its current status.</p>
              <button onClick={() => navigate('/user')}>
                View alerts <b>→</b>
              </button>
            </article>
            <article className="water-card">
              <WaterIllustration type="response" />
              <h3>Track Response</h3>
              <p>Follow published notices and recorded response actions.</p>
              <button onClick={() => navigate('/admin')}>
                View response <b>→</b>
              </button>
            </article>
          </div>
          <div className="water-footnote">
            <span>DEMO DATA · Illustrative readings</span>
            <span>Screening results do not certify water safety.</span>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. DEDICATED STAKEHOLDER PORTAL ACCESS SECTION                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="water-section login-portals-section" id="login-portals">
        <div className="water-shell">
          <header className="water-heading">
            <span className="portal-kicker">ROLE-BASED ACCESS · THREE DEDICATED PORTALS</span>
            <h2>
              Stakeholder portals,
              <br />
              <em>dedicated access for every role.</em>
            </h2>
            <p>
              Select your authorized workspace below to access live public telemetry, statutory municipal administration consoles, or accredited analytical laboratory desks.
            </p>
          </header>

          <div className="water-grid login-portals-grid">
            {/* Card 1: Citizen & Resident Portal */}
            <article
              className="water-card login-card login-card-citizen"
              onClick={() => navigate('/user')}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/user');
              }}
            >
              <div className="login-card-badge citizen-badge">PUBLIC CITIZEN ACCESS</div>
              <WaterIllustration type="citizen" />
              <h3>Citizen Portal</h3>
              <p>
                Explore real-time Gwalior ward tap potability, interactive GIS contamination maps, published safety advisories, and file municipal water complaints directly with the city surveillance desk.
              </p>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  navigate('/user');
                }}
                className="login-card-btn citizen-btn"
              >
                <span>Enter Citizen Portal</span> <b>→</b>
              </button>
            </article>

            {/* Card 2: Municipal Administrator Console */}
            <article
              className="water-card login-card login-card-admin"
              onClick={() => navigate('/admin')}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/admin');
              }}
            >
              <div className="login-card-badge admin-badge">RESTRICTED MUNICIPAL ADMIN</div>
              <WaterIllustration type="admin" />
              <h3>Admin Console</h3>
              <p>
                Configure BIS IS 10500 regulatory thresholds, evaluate automated anomaly alerts, dispatch ward inspection crews, track grievance triages, and log immutable response action ledgers.
              </p>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  navigate('/admin');
                }}
                className="login-card-btn admin-btn"
              >
                <span>Enter Admin Console</span> <b>→</b>
              </button>
            </article>

            {/* Card 3: Laboratory Personnel Portal */}
            <article
              className="water-card login-card login-card-lab"
              onClick={() => navigate('/lab')}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/lab');
              }}
            >
              <div className="login-card-badge lab-badge">NABL ACCREDITED TESTING DESK</div>
              <WaterIllustration type="lab" />
              <h3>Laboratory Portal</h3>
              <p>
                Accredited analytical testing desk for certified chemists to upload PDF test certificates, record spectrometry assays, validate coliform CFU parameters, and manage AES-256 S3 evidence archives.
              </p>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  navigate('/lab');
                }}
                className="login-card-btn lab-btn"
              >
                <span>Enter Lab Portal</span> <b>→</b>
              </button>
            </article>
          </div>

          <div className="water-footnote">
            <span>CENTRAL AWS COGNITO AUTHENTICATION · ROLE-BASED ACCESS CONTROL (RBAC)</span>
            <span>NABL ISO/IEC 17025 &amp; BIS IS 10500:2012 Statutory Compliance</span>
          </div>
        </div>
      </section>

      <LandingDetails onOpenPortal={portal => navigate(portal === 'admin' ? '/admin' : '/user')} />
      <CommonFooter />
    </div>
  );
};

export default HomePage;
