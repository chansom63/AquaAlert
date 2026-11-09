import { useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import CinematicHero from '../components/CinematicHero';
import WaterIllustration from '../components/illustrations/WaterIllustration';
import CommonFooter from '../components/layout/CommonFooter';
import LandingDetails from '../components/landing/LandingDetails';
import { useAuth } from '../features/auth/AuthContext';
import { AuthModal } from '../components/auth/AuthModal';
import { Sparkles, LogOut } from 'lucide-react';

const HomePage: FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, isAnalyst, demoLogin, logout } = useAuth();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [targetDestination, setTargetDestination] = useState<'/user' | '/admin' | '/lab'>('/user');

  const handleOneClick = (role: 'ADMIN' | 'ANALYST' | 'CITIZEN', path: string) => {
    demoLogin(role);
    navigate(path);
  };

  const handleCardClick = (path: '/user' | '/admin' | '/lab') => {
    if (path === '/admin') {
      if (isAuthenticated && isAdmin) {
        navigate('/admin');
      } else {
        setTargetDestination('/admin');
        setAuthMode('signin');
        setAuthModalOpen(true);
      }
    } else if (path === '/lab') {
      if (isAuthenticated && (isAnalyst || isAdmin)) {
        navigate('/lab');
      } else {
        setTargetDestination('/lab');
        setAuthMode('signin');
        setAuthModalOpen(true);
      }
    } else {
      if (isAuthenticated) {
        navigate('/user');
      } else {
        setTargetDestination('/user');
        setAuthMode('signin');
        setAuthModalOpen(true);
      }
    }
  };

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
      {/* 2. DEDICATED STAKEHOLDER PORTAL ACCESS & LOGIN SECTION       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="water-section login-portals-section" id="login-portals">
        <div className="water-shell">
          <header className="water-heading">
            <span className="portal-kicker">ROLE-BASED AUTHENTICATION · THREE DEDICATED PORTALS</span>
            <h2>
              Portal login,
              <br />
              <em>secure access for every stakeholder.</em>
            </h2>
            <p>
              Select your authorized workspace below to access live public telemetry, statutory municipal administration consoles, or accredited analytical laboratory desks.
            </p>
          </header>

          <div className="water-grid login-portals-grid">
            {/* Card 1: Citizen & Resident Portal Login */}
            <article
              className={`water-card login-card login-card-citizen ${isAuthenticated && !isAdmin && !isAnalyst ? 'login-card-active' : ''}`}
              onClick={() => handleCardClick('/user')}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') handleCardClick('/user');
              }}
            >
              <div className="login-card-top-row">
                {isAuthenticated && !isAdmin && !isAnalyst ? (
                  <div className="login-card-badge active-session-badge">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5 inline-block" />
                    SIGNED IN · CITIZEN
                  </div>
                ) : (
                  <div className="login-card-badge citizen-badge">PUBLIC CITIZEN ACCESS</div>
                )}
              </div>
              <WaterIllustration type="citizen" />
              <h3>Citizen Portal</h3>
              <p>
                Explore real-time Gwalior ward tap potability, interactive GIS contamination maps, published safety advisories, and file municipal water complaints directly with the city surveillance desk.
              </p>

              <div className="login-card-actions" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => handleOneClick('CITIZEN', '/user')}
                  className="login-card-quick-btn"
                  title="1-Click Instant Citizen Login (for quick evaluation)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>1-Click Citizen Access</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCardClick('/user')}
                  className="login-card-btn citizen-btn"
                >
                  <span>{isAuthenticated && !isAdmin && !isAnalyst ? 'Enter Citizen Portal' : 'Login as a User'}</span>
                  <b>→</b>
                </button>
              </div>
            </article>

            {/* Card 2: Municipal Administrator Console Login */}
            <article
              className={`water-card login-card login-card-admin ${isAuthenticated && isAdmin ? 'login-card-active' : ''}`}
              onClick={() => handleCardClick('/admin')}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') handleCardClick('/admin');
              }}
            >
              <div className="login-card-top-row">
                {isAuthenticated && isAdmin ? (
                  <div className="login-card-badge active-session-badge">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5 inline-block" />
                    SIGNED IN · MUNICIPAL ADMIN
                  </div>
                ) : (
                  <div className="login-card-badge admin-badge">RESTRICTED MUNICIPAL ADMIN</div>
                )}
              </div>
              <WaterIllustration type="admin" />
              <h3>Admin Console</h3>
              <p>
                Configure BIS IS 10500 regulatory thresholds, evaluate automated anomaly alerts, dispatch ward inspection crews, track grievance triages, and log immutable response action ledgers.
              </p>

              <div className="login-card-actions" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => handleOneClick('ADMIN', '/admin')}
                  className="login-card-quick-btn"
                  title="1-Click Instant Administrator Login"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>1-Click Admin Access</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCardClick('/admin')}
                  className="login-card-btn admin-btn"
                >
                  <span>{isAuthenticated && isAdmin ? 'Enter Admin Console' : 'Login as Admin'}</span>
                  <b>→</b>
                </button>
              </div>
            </article>

            {/* Card 3: Laboratory Personnel Login */}
            <article
              className={`water-card login-card login-card-lab ${isAuthenticated && (isAnalyst || isAdmin) ? 'login-card-active' : ''}`}
              onClick={() => handleCardClick('/lab')}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') handleCardClick('/lab');
              }}
            >
              <div className="login-card-top-row">
                {isAuthenticated && (isAnalyst || isAdmin) ? (
                  <div className="login-card-badge active-session-badge">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5 inline-block" />
                    SIGNED IN · LAB ANALYST
                  </div>
                ) : (
                  <div className="login-card-badge lab-badge">NABL ACCREDITED TESTING DESK</div>
                )}
              </div>
              <WaterIllustration type="lab" />
              <h3>Laboratory Portal</h3>
              <p>
                Accredited analytical testing desk for certified chemists to upload PDF test certificates, record spectrometry assays, validate coliform CFU parameters, and manage AES-256 S3 evidence archives.
              </p>

              <div className="login-card-actions" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => handleOneClick('ANALYST', '/lab')}
                  className="login-card-quick-btn"
                  title="1-Click Instant Lab Analyst Login"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>1-Click Analyst Access</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCardClick('/lab')}
                  className="login-card-btn lab-btn"
                >
                  <span>{isAuthenticated && (isAnalyst || isAdmin) ? 'Enter Lab Portal' : 'Login as Lab Personnel'}</span>
                  <b>→</b>
                </button>
              </div>
            </article>
          </div>

          <div className="water-footnote flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>CENTRAL AWS COGNITO AUTHENTICATION · ROLE-BASED ACCESS CONTROL (RBAC)</span>
            {isAuthenticated ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">
                  Active User: <strong className="text-white">{user?.name || user?.email}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 underline cursor-pointer ml-2"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <span>NABL ISO/IEC 17025 &amp; BIS IS 10500:2012 Statutory Compliance</span>
            )}
          </div>
        </div>
      </section>

      {/* Embedded Credentials Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onSuccess={() => {
          setAuthModalOpen(false);
          navigate(targetDestination);
        }}
      />

      <LandingDetails onOpenPortal={portal => navigate(portal === 'admin' ? '/admin' : '/user')} />
      <CommonFooter />
    </div>
  );
};

export default HomePage;
