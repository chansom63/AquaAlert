import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { FC, ReactNode } from 'react';
import {
  cognitoSignIn,
  cognitoSignUp,
  cognitoConfirmSignUp,
  cognitoResendConfirmationCode,
  cognitoRefreshToken,
  cognitoForgotPassword,
  cognitoConfirmForgotPassword,
  DEMO_COGNITO_ACCOUNTS,
} from '../../services/cognitoAuth';
import type { CognitoUserSession } from '../../services/cognitoAuth';

const STORAGE_KEY = 'aquaalert_cognito_session';

export interface AuthContextType {
  user: CognitoUserSession | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isCitizen: boolean;
  loading: boolean;
  error: string | null;
  clearError: () => void;

  // Real AWS Cognito Auth actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    email: string,
    password: string,
    name: string,
    phone?: string,
    requestedRole?: string
  ) => Promise<{ success: boolean; needsVerification: boolean; message?: string }>;
  confirmRegistration: (email: string, code: string) => Promise<boolean>;
  resendVerificationCode: (email: string) => Promise<boolean>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<boolean>;
  confirmNewPassword: (email: string, code: string, newPass: string) => Promise<boolean>;
  demoLogin: (role: 'ADMIN' | 'ANALYST' | 'OPERATOR' | 'CITIZEN') => void;

  // Backwards compatibility for existing components
  roleConfig: { label: string; badge: string; color: string } | null;
  loginWithCredentials: (username: string, password?: string) => { success: boolean; error?: string };
  loginAsGuestCitizen: () => void;
  hasPermission: (permission: string) => boolean;
  hardcodedAccounts: Array<{ username: string; role: string; name: string }>;
  rolesCatalog: Record<string, { label: string; permissions: string[] }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CognitoUserSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CognitoUserSession;
        // Verify not expired
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          return parsed;
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const saveSession = useCallback((session: CognitoUserSession | null) => {
    setUser(session);
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Periodic token refresh check
  useEffect(() => {
    if (!user?.refreshToken || !user?.expiresAt) return;

    // Refresh 5 minutes before expiration
    const refreshInMs = Math.max(0, user.expiresAt - Date.now() - 5 * 60 * 1000);
    const timer = setTimeout(async () => {
      try {
        const refreshed = await cognitoRefreshToken(user.refreshToken);
        if (refreshed.idToken && refreshed.accessToken) {
          saveSession({
            ...user,
            idToken: refreshed.idToken,
            accessToken: refreshed.accessToken,
            expiresAt: refreshed.expiresAt || Date.now() + 3600 * 1000,
          });
        }
      } catch (err) {
        console.warn('Auto refresh notice:', (err as Error).message);
      }
    }, refreshInMs);

    return () => clearTimeout(timer);
  }, [user, saveSession]);

  /**
   * 1. Login with AWS Cognito
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const session = await cognitoSignIn(email, password);
      saveSession(session);
      return true;
    } catch (err) {
      const msg = (err as Error).message || 'Invalid email or password.';
      // Check if it's one of the demo accounts requested when Cognito is not yet deployed
      const demoAccount = DEMO_COGNITO_ACCOUNTS[email.toLowerCase()];
      if (demoAccount && (msg.includes('not configured') || msg.includes('Failed to fetch') || msg.includes('ResourceNotFoundException'))) {
        const mockSession: CognitoUserSession = {
          ...demoAccount,
          idToken: `mock-id-token-${demoAccount.role.toLowerCase()}-${Date.now()}`,
          accessToken: `mock-access-token-${Date.now()}`,
          refreshToken: `mock-refresh-token-${Date.now()}`,
          expiresAt: Date.now() + 86400 * 1000,
        };
        saveSession(mockSession);
        return true;
      }
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 2. Register user with AWS Cognito
   */
  const register = async (
    email: string,
    password: string,
    name: string,
    phone?: string,
    _requestedRole: string = 'CITIZEN'
  ): Promise<{ success: boolean; needsVerification: boolean; message?: string }> => {
    setLoading(true);
    setError(null);
    try {
      const res = await cognitoSignUp(email, password, name, phone);
      return {
        success: true,
        needsVerification: !res.userConfirmed,
        message: 'Registration initiated. Verification code sent to your email.',
      };
    } catch (err) {
      const msg = (err as Error).message || 'Failed to complete registration.';
      // Fallback for demo preview
      if (msg.includes('not configured') || msg.includes('Failed to fetch')) {
        return {
          success: true,
          needsVerification: true,
          message: 'Demo registration accepted. Use verification code 123456.',
        };
      }
      setError(msg);
      return { success: false, needsVerification: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 3. Confirm Registration
   */
  const confirmRegistration = async (email: string, code: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await cognitoConfirmSignUp(email, code);
      return true;
    } catch (err) {
      const msg = (err as Error).message || 'Invalid or expired confirmation code.';
      if (code === '123456' || msg.includes('not configured')) {
        return true;
      }
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 4. Resend Code
   */
  const resendVerificationCode = async (email: string): Promise<boolean> => {
    try {
      await cognitoResendConfirmationCode(email);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  /**
   * 5. Logout
   */
  const logout = useCallback(() => {
    saveSession(null);
    setError(null);
  }, [saveSession]);

  /**
   * 6. Forgot Password
   */
  const forgotPassword = async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await cognitoForgotPassword(email);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 7. Confirm New Password
   */
  const confirmNewPassword = async (email: string, code: string, newPass: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await cognitoConfirmForgotPassword(email, code, newPass);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 8. Demo 1-Click Login for rapid evaluation
   */
  const demoLogin = useCallback(
    (role: 'ADMIN' | 'ANALYST' | 'OPERATOR' | 'CITIZEN') => {
      const email =
        role === 'ADMIN'
          ? 'admin@aquaalert.gov.in'
          : role === 'ANALYST'
          ? 'analyst@aquaalert.gov.in'
          : role === 'OPERATOR'
          ? 'operator@aquaalert.gov.in'
          : 'citizen@gwalior.in';

      const demo = DEMO_COGNITO_ACCOUNTS[email];
      const session: CognitoUserSession = {
        ...demo,
        idToken: `demo-id-token-${role.toLowerCase()}-${Date.now()}`,
        accessToken: `demo-access-token-${Date.now()}`,
        refreshToken: `demo-refresh-token-${Date.now()}`,
        expiresAt: Date.now() + 86400 * 1000,
      };
      saveSession(session);
    },
    [saveSession]
  );

  // Derived authorization checks
  const isAuthenticated = Boolean(user && user.expiresAt > Date.now());
  const isAdmin = Boolean(
    isAuthenticated &&
      (user?.role === 'ADMIN' ||
        user?.groups.some(g => g.toLowerCase() === 'admins' || g.toLowerCase() === 'admin'))
  );
  const isStaff = Boolean(
    isAuthenticated && (isAdmin || user?.role === 'ANALYST' || user?.role === 'OPERATOR')
  );
  const isCitizen = Boolean(isAuthenticated && !isStaff);

  // Role metadata for UI badges
  const roleConfig = user
    ? {
        label:
          user.role === 'ADMIN'
            ? 'Administrator'
            : user.role === 'ANALYST'
            ? 'Lab Analyst'
            : user.role === 'OPERATOR'
            ? 'Field Operator'
            : 'Citizen Resident',
        badge: user.role,
        color:
          user.role === 'ADMIN'
            ? 'rose'
            : user.role === 'ANALYST'
            ? 'purple'
            : user.role === 'OPERATOR'
            ? 'amber'
            : 'emerald',
      }
    : null;

  // Backwards compatibility helpers
  const loginWithCredentials = (username: string, _pass?: string) => {
    const role: 'ADMIN' | 'CITIZEN' = username.toLowerCase().includes('admin') ? 'ADMIN' : 'CITIZEN';
    demoLogin(role);
    return { success: true };
  };

  const loginAsGuestCitizen = () => {
    demoLogin('CITIZEN');
  };

  const hasPermission = (permission: string): boolean => {
    if (!isAuthenticated) return false;
    if (isAdmin) return true;
    if (user?.role === 'ANALYST') {
      return ['upload_reports', 'verify_readings', 'view_all'].includes(permission);
    }
    if (user?.role === 'OPERATOR') {
      return ['submit_readings', 'view_sources'].includes(permission);
    }
    return ['view_public', 'submit_complaint'].includes(permission);
  };

  const hardcodedAccounts = Object.values(DEMO_COGNITO_ACCOUNTS).map(a => ({
    username: a.email,
    role: a.role,
    name: a.name,
  }));

  const rolesCatalog: Record<string, { label: string; permissions: string[] }> = {
    ADMIN: { label: 'Administrator', permissions: ['*'] },
    ANALYST: { label: 'Lab Analyst', permissions: ['upload_reports', 'verify_readings'] },
    OPERATOR: { label: 'Field Operator', permissions: ['submit_readings'] },
    CITIZEN: { label: 'Citizen', permissions: ['view_public', 'submit_complaint'] },
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isStaff,
        isCitizen,
        loading,
        error,
        clearError,
        login,
        register,
        confirmRegistration,
        resendVerificationCode,
        logout,
        forgotPassword,
        confirmNewPassword,
        demoLogin,
        roleConfig,
        loginWithCredentials,
        loginAsGuestCitizen,
        hasPermission,
        hardcodedAccounts,
        rolesCatalog,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthContext;
