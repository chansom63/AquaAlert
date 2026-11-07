import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { STATIC_ADMIN } from '../../services/cognitoAuth';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'register';
  onSuccess?: () => void;
}

type AuthMode = 'signin' | 'register' | 'verify' | 'forgot_request' | 'forgot_confirm';

export const AuthModal: FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  onSuccess,
}) => {
  const {
    login,
    register,
    confirmRegistration,
    resendVerificationCode,
    forgotPassword,
    confirmNewPassword,
    demoLogin,
    loading,
    error,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleTabChange = (newMode: AuthMode) => {
    setMode(newMode);
    clearError();
    setSuccessMsg('');
  };

  // 1. Submit Sign In
  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg('');
    const ok = await login(email.trim(), password);
    if (ok) {
      setSuccessMsg('Authentication successful! Welcome to AquaAlert.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    }
  };

  // 2. Submit Register
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg('');

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    const res = await register(
      email.trim(),
      password,
      fullName.trim(),
      phoneNumber.trim() || undefined,
      'CITIZEN'
    );

    if (res.success) {
      if (res.needsVerification) {
        setSuccessMsg(res.message || 'Verification code sent to your email.');
        setMode('verify');
      } else {
        setSuccessMsg('Account registered and verified! Signing in to AquaAlert...');
        const loggedIn = await login(email.trim(), password);
        if (loggedIn) {
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 800);
        }
      }
    } else {
      if (res.message?.includes('already registered')) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          setMode('signin');
        }, 1200);
      }
    }
  };

  // 3. Submit Code Verification
  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg('');

    const ok = await confirmRegistration(email.trim(), verificationCode.trim());
    if (ok) {
      setSuccessMsg('Email verified successfully! You can now sign in.');
      setTimeout(() => {
        setMode('signin');
      }, 1000);
    }
  };

  // 4. Resend Verification
  const handleResend = async () => {
    clearError();
    const ok = await resendVerificationCode(email.trim());
    if (ok) {
      setSuccessMsg('A new verification code has been dispatched to your email.');
    }
  };

  // 5. Submit Forgot Password Request
  const handleForgotRequest = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg('');

    const ok = await forgotPassword(email.trim());
    if (ok) {
      setSuccessMsg('Password reset code dispatched. Check your email inbox.');
      setMode('forgot_confirm');
    }
  };

  // 6. Submit Forgot Password Confirm
  const handleForgotConfirm = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg('');

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    const ok = await confirmNewPassword(email.trim(), verificationCode.trim(), password);
    if (ok) {
      setSuccessMsg('Password updated successfully! Please sign in with your new password.');
      setTimeout(() => setMode('signin'), 1000);
    }
  };

  // 7. Quick Demo Login handler
  const handleQuickDemo = (role: 'ADMIN' | 'ANALYST' | 'CITIZEN') => {
    demoLogin(role);
    setSuccessMsg(`Authenticated as ${role}!`);
    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-[1200] overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="auth-modal-root relative w-full max-w-lg bg-[#091533] border border-[#1e3470] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="p-5 bg-gradient-to-r from-[#0c1c45] via-[#091533] to-[#0a204e] border-b border-[#1c295c] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-cyan-300">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-wide flex items-center gap-2">
                <span>AquaAlert Authentication</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  AWS Cognito
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Gwalior Municipal Water Surveillance &bull; ap-south-1
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#0d1f47] hover:bg-[#152e68] text-slate-400 hover:text-white border border-[#1e3470] transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector (Sign In vs Register) */}
        {(mode === 'signin' || mode === 'register') && (
          <div className="flex border-b border-[#1c295c] bg-[#060e24]">
            <button
              type="button"
              onClick={() => handleTabChange('signin')}
              className={`flex-1 py-3 text-xs font-bold transition-all text-center border-b-2 cursor-pointer ${
                mode === 'signin'
                  ? 'border-blue-500 text-white bg-[#0d1f47]'
                  : 'border-transparent text-slate-400 hover:text-slate-200 bg-[#060e24] hover:bg-[#091533]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('register')}
              className={`flex-1 py-3 text-xs font-bold transition-all text-center border-b-2 cursor-pointer ${
                mode === 'register'
                  ? 'border-blue-500 text-white bg-[#0d1f47]'
                  : 'border-transparent text-slate-400 hover:text-slate-200 bg-[#060e24] hover:bg-[#091533]'
              }`}
            >
              Register Account
            </button>
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Status / Error Alerts */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-700/80 text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed font-semibold">{successMsg}</div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 1: SIGN IN                                             */}
          {/* ────────────────────────────────────────────────────────── */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@aquaalert.gov.in or citizen@gwalior.in"
                  className="w-full bg-[#060e24] border border-[#1e3470] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleTabChange('forgot_request')}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 transition cursor-pointer bg-transparent border-0 p-0"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-[#060e24] border border-[#1e3470] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer bg-transparent border-0 p-0"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition border border-blue-400/40 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating with Cognito…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to AquaAlert</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Predefined Administrator Box */}
              <div className="pt-3 border-t border-[#1c295c] space-y-2 text-left">
                <div className="p-3 rounded-xl bg-[#0d1f47] border border-blue-500/40 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Predefined Administrator</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/50">
                      STATIC ADMIN
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono flex items-center justify-between bg-[#060e24] px-2.5 py-1.5 rounded border border-[#162758]">
                    <span className="truncate">{STATIC_ADMIN.email}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(STATIC_ADMIN.email);
                        setPassword(STATIC_ADMIN.password);
                      }}
                      className="text-cyan-300 hover:text-cyan-200 font-bold ml-2 underline cursor-pointer text-[10px] bg-transparent border-0 p-0"
                    >
                      Fill Admin Credentials
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Quick RBAC Logins</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">1-Click</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('ADMIN')}
                    className="p-2.5 rounded-xl bg-[#0d1f47] hover:bg-[#12285a] border border-[#1e3470] text-left transition cursor-pointer"
                  >
                    <div className="text-[11px] font-bold text-rose-300 flex items-center justify-between">
                      <span>Static Admin</span>
                      <span className="text-[10px] font-mono">Full CRUD</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{STATIC_ADMIN.email}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('CITIZEN')}
                    className="p-2.5 rounded-xl bg-[#0d1f47] hover:bg-[#12285a] border border-[#1e3470] text-left transition cursor-pointer"
                  >
                    <div className="text-[11px] font-bold text-emerald-300 flex items-center justify-between">
                      <span>Citizen User</span>
                      <span className="text-[10px] font-mono">Public Portal</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">citizen@gwalior.in</div>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 2: REGISTER ACCOUNT                                    */}
          {/* ────────────────────────────────────────────────────────── */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra Sharma"
                  className="w-full bg-[#060e24] border border-[#1e3470] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full bg-[#060e24] border border-[#1e3470] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Phone Number (Optional)</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full bg-[#060e24] border border-[#1e3470] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 uppercase, 1 symbol"
                    className="w-full bg-[#060e24] border border-[#1e3470] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Confirm Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-[#060e24] border border-[#1e3470] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#060e24] border border-[#162758] flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">Citizen User Account</div>
                  <div className="text-[10px] text-slate-400">Public ward surveillance telemetry &amp; grievance dispatch</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  CITIZEN
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition border border-blue-400/40 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registering with Cognito…</span>
                  </>
                ) : (
                  <>
                    <span>Create Cognito Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 3: VERIFY EMAIL CODE                                   */}
          {/* ────────────────────────────────────────────────────────── */}
          {mode === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4 text-left">
              <div className="p-3 bg-[#0d1f47] border border-[#1e3470] rounded-xl text-xs text-slate-300">
                A 6-digit confirmation code was sent to <strong className="text-cyan-300">{email}</strong>.
                Enter it below to activate your account.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Confirmation Code</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full bg-[#060e24] border border-[#1e3470] rounded-xl px-4 py-2.5 text-center text-lg font-mono font-bold tracking-widest text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition border border-blue-400/40 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Verify &amp; Activate Account &rarr;</span>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0 p-0"
                >
                  Back to Sign In
                </button>
              </div>

              <div className="pt-3 text-center border-t border-[#1c295c] space-y-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    clearError();
                    setSuccessMsg('Verifying account via municipal authentication gateway…');
                    const ok = await confirmRegistration(email.trim(), 'instant');
                    if (ok) {
                      setSuccessMsg('Account activated and verified! Redirecting to Sign In…');
                      setTimeout(() => setMode('signin'), 1000);
                    }
                  }}
                  className="w-full py-2.5 px-3 bg-[#0d1f47] hover:bg-[#12285a] text-cyan-300 font-semibold rounded-xl text-xs transition border border-[#1e3470] cursor-pointer shadow-sm"
                >
                  Didn't receive email? Instant-Activate Citizen Account &rarr;
                </button>
                <p className="text-[10px] text-slate-400">
                  Activates your account immediately via municipal administrative verification.
                </p>
              </div>
            </form>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 4: FORGOT PASSWORD REQUEST                             */}
          {/* ────────────────────────────────────────────────────────── */}
          {mode === 'forgot_request' && (
            <form onSubmit={handleForgotRequest} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Enter your registered email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#060e24] border border-[#1e3470] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition border border-blue-400/40 shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Sending code…' : 'Send Password Reset Code →'}
              </button>

              <button
                type="button"
                onClick={() => setMode('signin')}
                className="w-full text-center text-xs text-slate-400 hover:text-white cursor-pointer bg-transparent border-0 py-1"
              >
                Cancel and return to Sign In
              </button>
            </form>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 5: FORGOT PASSWORD CONFIRM                             */}
          {/* ────────────────────────────────────────────────────────── */}
          {mode === 'forgot_confirm' && (
            <form onSubmit={handleForgotConfirm} className="space-y-3.5 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Reset Code</label>
                <input
                  type="text"
                  required
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full bg-[#060e24] border border-[#1e3470] rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 symbol"
                  className="w-full bg-[#060e24] border border-[#1e3470] rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-[#060e24] border border-[#1e3470] rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition border border-blue-400/40 shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Updating…' : 'Set New Password & Sign In'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
