import { useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Lock,
  User,
  ArrowRight,
  LogOut,
  ChevronLeft,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { AuthModal } from './AuthModal';
import { STATIC_ADMIN } from '../../services/cognitoAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * 1. RequireAuth: Ensures user is authenticated (Citizen or Admin).
 * If not authenticated, renders a full-page gatekeeper.
 */
export const RequireAuth: FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060e24] flex items-center justify-center p-6 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-mono">Verifying authentication session…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-gatekeeper-root min-h-screen bg-[#060e24] flex flex-col justify-between p-6 sm:p-12 text-white font-sans">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-[#1c295c] pb-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#0d1f47] hover:bg-[#12285a] px-3.5 py-2 rounded-xl border border-[#1e3470] shadow-sm transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-cyan-400" />
            <span>Back to Home</span>
          </button>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-blue-950 text-cyan-300 border border-blue-800/60">
            PROTECTED USER PORTAL
          </span>
        </header>

        {/* Gatekeeper Card */}
        <div className="max-w-xl mx-auto w-full py-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-600/20 border border-blue-400/40 text-cyan-300 flex items-center justify-center shadow-xl shadow-blue-500/10">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
              AUTHENTICATION REQUIRED &bull; GWALIOR WATER MONITOR
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Sign In to Access User Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Ward water quality surveillance, laboratory analysis certificates, and citizen grievance reporting are restricted to registered users.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#091533] border border-[#1e3470] space-y-3 shadow-xl">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthModalOpen(true);
                }}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition border border-blue-400/40 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Sign In with Existing Account</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthModalOpen(true);
                }}
                className="flex-1 py-3 px-4 bg-[#0d1f47] hover:bg-[#12285a] text-cyan-300 font-bold rounded-xl text-xs transition border border-[#1e3470] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Register New Citizen Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              New citizens can register with their email. An AWS Cognito confirmation code will be dispatched.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-[11px] text-slate-500 pt-6 border-t border-[#1c295c]">
          Gwalior Municipal Corporation &bull; Bureau of Indian Standards IS 10500:2012 Compliance
        </footer>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authMode}
        />
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * 2. RequireAdmin: Ensures user is authenticated AND has the static/predefined Admin role.
 * If not authenticated, renders the Admin login gatekeeper.
 * If authenticated as Citizen, renders Access Denied.
 */
export const RequireAdmin: FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, user, loading, logout, demoLogin } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080e26] flex items-center justify-center p-6 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-rose-500/30 border-t-rose-400 rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-mono">Verifying administrator authorization…</span>
        </div>
      </div>
    );
  }

  // Not authenticated at all -> Show Admin Gatekeeper
  if (!isAuthenticated) {
    return (
      <div className="auth-gatekeeper-root min-h-screen bg-[#080e26] flex flex-col justify-between p-6 sm:p-12 text-white font-sans">
        <header className="flex items-center justify-between border-b border-[#1c295c] pb-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#0d1f47] hover:bg-[#12285a] px-3.5 py-2 rounded-xl border border-[#1e3470] shadow-sm transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-cyan-400" />
            <span>Back to Home</span>
          </button>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800/60">
            RESTRICTED ADMIN CONSOLE
          </span>
        </header>

        <div className="max-w-lg mx-auto w-full py-10 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-600/20 border border-rose-400/40 text-rose-400 flex items-center justify-center shadow-xl shadow-rose-500/10">
            <KeyRound className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold tracking-widest text-rose-400 uppercase">
              PREDEFINED ADMINISTRATOR ACCESS ONLY
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Municipal Admin Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Full CRUD access to evaluation rules, water quality thresholds, telemetry calibration, and response ledgers is strictly reserved for predefined administrators.
            </p>
          </div>

          {/* Predefined Admin Credentials Card */}
          <div className="p-5 rounded-2xl bg-[#091533] border border-[#1e3470] text-left space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1c295c] pb-2">
              <span className="text-xs font-bold text-slate-200">Predefined Administrator Credentials</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/50">
                STATIC ADMIN
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center bg-[#060e24] p-2.5 rounded-lg border border-[#162758]">
                <span className="text-slate-400">Admin Email:</span>
                <span className="text-cyan-300 font-bold select-all">{STATIC_ADMIN.email}</span>
              </div>
              <div className="flex justify-between items-center bg-[#060e24] p-2.5 rounded-lg border border-[#162758]">
                <span className="text-slate-400">Password:</span>
                <span className="text-slate-300 select-all">{STATIC_ADMIN.password}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => demoLogin('ADMIN')}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition border border-blue-400/40 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>1-Click Sign In as Admin</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="py-3 px-4 bg-[#0d1f47] hover:bg-[#12285a] text-slate-200 font-semibold rounded-xl text-xs transition border border-[#1e3470] cursor-pointer"
              >
                Enter Credentials
              </button>
            </div>
          </div>
        </div>

        <footer className="text-center text-[11px] text-slate-500 pt-6 border-t border-[#1c295c]">
          Authorized municipal engineers only &bull; Unauthorized access is strictly logged and audited.
        </footer>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode="signin"
        />
      </div>
    );
  }

  // Authenticated, but NOT an admin (e.g. Citizen user) -> Show Access Denied
  if (!isAdmin) {
    return (
      <div className="auth-gatekeeper-root min-h-screen bg-[#080e26] flex flex-col justify-between p-6 sm:p-12 text-white font-sans">
        <header className="flex items-center justify-between border-b border-[#1c295c] pb-4">
          <button
            type="button"
            onClick={() => navigate('/user')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#0d1f47] hover:bg-[#12285a] px-3.5 py-2 rounded-xl border border-[#1e3470] shadow-sm transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-cyan-400" />
            <span>Go to Citizen Portal</span>
          </button>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800/60">
            ACCESS RESTRICTED
          </span>
        </header>

        <div className="max-w-md mx-auto w-full py-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-600/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/10">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold tracking-widest text-amber-400 uppercase">
              CITIZEN ROLE DETECTED &bull; ACCESS FORBIDDEN
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Administrator Privileges Required
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              You are signed in as <strong className="text-amber-300">{user?.email}</strong> with a Citizen Resident account. The Municipal Admin Console is restricted to predefined municipal administrators.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#091533] border border-[#1e3470] space-y-3 shadow-xl">
            <button
              type="button"
              onClick={() => navigate('/user')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition border border-blue-400/40 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Return to Citizen Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                logout();
                setAuthModalOpen(true);
              }}
              className="w-full py-2.5 bg-[#0d1f47] hover:bg-[#12285a] text-rose-300 font-semibold rounded-xl text-xs transition border border-[#1e3470] flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out &amp; Log In as Predefined Admin</span>
            </button>
          </div>
        </div>

        <footer className="text-center text-[11px] text-slate-500 pt-6 border-t border-[#1c295c]">
          RBAC Policy Enforced &bull; Gwalior Municipal Corporation
        </footer>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode="signin"
        />
      </div>
    );
  }

  return <>{children}</>;
};
