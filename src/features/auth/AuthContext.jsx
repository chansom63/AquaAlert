import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext({
  user: null,
  roleConfig: null,
  isStaff: false,
  loginWithCredentials: () => ({ success: true }),
  loginAsGuestCitizen: () => {},
  logout: () => {},
  hasPermission: () => false,
  hardcodedAccounts: [],
  rolesCatalog: {}
});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const isStaff = currentUser && currentUser.role !== 'CITIZEN';

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        roleConfig: null,
        isStaff,
        loginWithCredentials: () => ({ success: true }),
        loginAsGuestCitizen: () => {},
        logout: () => setCurrentUser(null),
        hasPermission: () => false,
        hardcodedAccounts: [],
        rolesCatalog: {}
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || { isStaff: false, user: null };
};
