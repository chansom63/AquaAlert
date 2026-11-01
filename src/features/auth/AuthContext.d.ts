export interface AuthContextType {
  user: unknown;
  roleConfig: unknown;
  isStaff: boolean;
  loginWithCredentials: (username: string, password?: string) => { success: boolean; error?: string };
  loginAsGuestCitizen: () => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hardcodedAccounts: unknown[];
  rolesCatalog: Record<string, unknown>;
}

export declare const AuthProvider: React.FC<{ children: React.ReactNode }>;
export declare const useAuth: () => AuthContextType;
