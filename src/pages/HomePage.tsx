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
      <CinematicHero
        onLoginSelect={portal => {
          navigate(portal === 'admin' ? '/admin' : '/user');
        }}
      />
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
            <article className="water-card">
              <WaterIllustration type="test" />
              <h3>Lab Reports &amp; Archive</h3>
              <p>Upload certified lab evidence and regulatory reports to secure encrypted document archive.</p>
              <button onClick={() => navigate('/upload-document')}>
                Upload Reports <b>→</b>
              </button>
            </article>
          </div>
          <div className="water-footnote">
            <span>DEMO DATA · Illustrative readings</span>
            <span>Screening results do not certify water safety.</span>
          </div>
        </div>
      </section>
      <LandingDetails onOpenPortal={portal => navigate(portal === 'admin' ? '/admin' : '/user')} />
      <CommonFooter />
    </div>
  );
};

export default HomePage;
