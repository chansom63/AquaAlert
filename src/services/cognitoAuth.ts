/**
 * AWS Cognito Identity Provider Client Service
 * Implements Zero-Dependency REST API communication with AWS Cognito IdP (ap-south-1)
 */

export interface CognitoUserSession {
  email: string;
  name: string;
  sub: string;
  groups: string[];
  role: 'ADMIN' | 'ANALYST' | 'OPERATOR' | 'CITIZEN';
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
}

export interface CognitoAuthError {
  code: string;
  message: string;
}

export const REGION = import.meta.env.VITE_AWS_REGION || 'ap-south-1';
export const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
export const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

/**
 * Predefined static administrator credentials
 */
export const STATIC_ADMIN = {
  email: 'admin@aquaalert.gov.in',
  password: 'AquaAlert@Admin2026!',
  name: 'Central Municipal Administrator (Dr. Rajesh Verma)',
  role: 'ADMIN' as const,
  groups: ['Admins'],
};

/**
 * Predefined static laboratory analyst credentials
 */
export const STATIC_ANALYST = {
  email: 'analyst@aquaalert.gov.in',
  password: 'AquaAlert@Lab2026!',
  name: 'Dr. S. Mukherjee (Lead Analytical Chemist)',
  role: 'ANALYST' as const,
  groups: ['Analysts'],
};

const COGNITO_ENDPOINT = `https://cognito-idp.${REGION}.amazonaws.com/`;

/**
 * Base64URL-safe JSON Web Token Decoder
 */
export const parseJwt = <T = Record<string, unknown>>(token: string): T | null => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as T;
  } catch {
    return null;
  }
};

/**
 * Low-level Cognito IdP JSON-RPC invoker
 */
const callCognito = async <T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown>
): Promise<T> => {
  if (!CLIENT_ID) {
    throw new Error('Cognito Client ID (VITE_COGNITO_CLIENT_ID) is not configured.');
  }

  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const code = (data.__type || 'CognitoError').split('#').pop() || 'CognitoError';
    const message = data.message || `Cognito ${action} error (${response.status})`;
    const error = new Error(message) as Error & CognitoAuthError;
    error.code = code;
    throw error;
  }

  return data as T;
};

/**
 * 1. Register a new user with Cognito User Pool
 */
export const cognitoSignUp = async (
  email: string,
  password: string,
  name: string,
  phoneNumber?: string
): Promise<{ userSub: string; userConfirmed: boolean }> => {
  const userAttributes: Array<{ Name: string; Value: string }> = [
    { Name: 'email', Value: email },
    { Name: 'name', Value: name },
  ];

  if (phoneNumber) {
    userAttributes.push({ Name: 'phone_number', Value: phoneNumber });
  }

  const res = await callCognito<{ UserSub: string; UserConfirmed: boolean }>('SignUp', {
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: userAttributes,
  });

  return {
    userSub: res.UserSub,
    userConfirmed: res.UserConfirmed,
  };
};

/**
 * 2. Confirm user registration with verification code
 */
export const cognitoConfirmSignUp = async (
  email: string,
  confirmationCode: string
): Promise<void> => {
  await callCognito('ConfirmSignUp', {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: confirmationCode.trim(),
  });
};

/**
 * 3. Resend email confirmation code
 */
export const cognitoResendConfirmationCode = async (email: string): Promise<void> => {
  await callCognito('ResendConfirmationCode', {
    ClientId: CLIENT_ID,
    Username: email,
  });
};

/**
 * 4. Sign in user with email & password (USER_PASSWORD_AUTH)
 */
export const cognitoSignIn = async (
  email: string,
  password: string
): Promise<CognitoUserSession> => {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Static Predefined Administrator Authentication
  if (normalizedEmail === STATIC_ADMIN.email.toLowerCase()) {
    if (password === STATIC_ADMIN.password) {
      return {
        email: STATIC_ADMIN.email,
        name: STATIC_ADMIN.name,
        sub: 'static-admin-sub-001',
        groups: ['Admins'],
        role: 'ADMIN',
        idToken: `static-admin-token-${Date.now()}`,
        accessToken: `static-admin-access-${Date.now()}`,
        refreshToken: `static-admin-refresh-${Date.now()}`,
        expiresAt: Date.now() + 86400 * 1000,
      };
    } else {
      throw new Error('Invalid password for predefined administrator account.');
    }
  }

  // 2. Static Predefined Laboratory Analyst Authentication
  if (normalizedEmail === STATIC_ANALYST.email.toLowerCase()) {
    if (password === STATIC_ANALYST.password) {
      return {
        email: STATIC_ANALYST.email,
        name: STATIC_ANALYST.name,
        sub: 'static-analyst-sub-002',
        groups: ['Analysts'],
        role: 'ANALYST',
        idToken: `static-analyst-token-${Date.now()}`,
        accessToken: `static-analyst-access-${Date.now()}`,
        refreshToken: `static-analyst-refresh-${Date.now()}`,
        expiresAt: Date.now() + 86400 * 1000,
      };
    } else {
      throw new Error('Invalid password for accredited lab analyst account.');
    }
  }

  // 2. Regular User Authentication with AWS Cognito
  const res = await callCognito<{
    AuthenticationResult?: {
      IdToken: string;
      AccessToken: string;
      RefreshToken?: string;
      ExpiresIn: number;
    };
  }>('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  const auth = res.AuthenticationResult;
  if (!auth) {
    throw new Error('Authentication challenge required or unexpected Cognito response.');
  }

  return buildSessionFromTokens(auth.IdToken, auth.AccessToken, auth.RefreshToken || '', auth.ExpiresIn);
};

/**
 * 5. Refresh session using RefreshToken (REFRESH_TOKEN_AUTH)
 */
export const cognitoRefreshToken = async (
  refreshToken: string
): Promise<Partial<CognitoUserSession>> => {
  const res = await callCognito<{
    AuthenticationResult?: {
      IdToken: string;
      AccessToken: string;
      ExpiresIn: number;
    };
  }>('InitiateAuth', {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });

  const auth = res.AuthenticationResult;
  if (!auth) throw new Error('Token refresh failed.');

  return {
    idToken: auth.IdToken,
    accessToken: auth.AccessToken,
    expiresAt: Date.now() + auth.ExpiresIn * 1000,
  };
};

/**
 * 6. Initiate Forgot Password
 */
export const cognitoForgotPassword = async (email: string): Promise<void> => {
  await callCognito('ForgotPassword', {
    ClientId: CLIENT_ID,
    Username: email,
  });
};

/**
 * 7. Confirm Forgot Password
 */
export const cognitoConfirmForgotPassword = async (
  email: string,
  confirmationCode: string,
  newPassword: string
): Promise<void> => {
  await callCognito('ConfirmForgotPassword', {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: confirmationCode.trim(),
    Password: newPassword,
  });
};

/**
 * Extract claims from ID Token and determine RBAC Role
 */
export const buildSessionFromTokens = (
  idToken: string,
  accessToken: string,
  refreshToken: string,
  expiresInSeconds: number
): CognitoUserSession => {
  const claims = parseJwt<Record<string, unknown>>(idToken) || {};
  const groupsRaw = claims['cognito:groups'];
  const groups: string[] = Array.isArray(groupsRaw)
    ? groupsRaw.map(String)
    : typeof groupsRaw === 'string'
    ? groupsRaw.split(',').map(s => s.trim())
    : [];

  let role: CognitoUserSession['role'] = 'CITIZEN';
  if (groups.some(g => g.toLowerCase() === 'admins' || g.toLowerCase() === 'admin')) {
    role = 'ADMIN';
  } else if (groups.some(g => g.toLowerCase() === 'analysts' || g.toLowerCase() === 'analyst')) {
    role = 'ANALYST';
  } else if (groups.some(g => g.toLowerCase() === 'operators' || g.toLowerCase() === 'operator')) {
    role = 'OPERATOR';
  }

  return {
    email: String(claims.email || ''),
    name: String(claims.name || claims.given_name || claims['cognito:username'] || claims.email || 'User'),
    sub: String(claims.sub || ''),
    groups,
    role,
    idToken,
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };
};

/**
 * Built-in Demo accounts for evaluation/review when offline or testing without Cognito credentials
 */
export const DEMO_COGNITO_ACCOUNTS: Record<string, Omit<CognitoUserSession, 'idToken' | 'accessToken' | 'refreshToken' | 'expiresAt'>> = {
  'admin@aquaalert.gov.in': {
    email: 'admin@aquaalert.gov.in',
    name: 'Municipal Administrator (Dr. Rajesh Verma)',
    sub: 'cognito-sub-admin-001',
    groups: ['Admins'],
    role: 'ADMIN',
  },
  'analyst@aquaalert.gov.in': {
    email: 'analyst@aquaalert.gov.in',
    name: 'Lead Water Chemist (Dr. S. Mukherjee)',
    sub: 'cognito-sub-analyst-002',
    groups: ['Analysts'],
    role: 'ANALYST',
  },
  'operator@aquaalert.gov.in': {
    email: 'operator@aquaalert.gov.in',
    name: 'Field Surveillance Officer (Rohit Sharma)',
    sub: 'cognito-sub-operator-003',
    groups: ['Operators'],
    role: 'OPERATOR',
  },
  'citizen@gwalior.in': {
    email: 'citizen@gwalior.in',
    name: 'Gwalior Resident (Pooja Mishra)',
    sub: 'cognito-sub-citizen-004',
    groups: ['Citizens'],
    role: 'CITIZEN',
  },
};
