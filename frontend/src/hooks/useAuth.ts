import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (newToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('crm_token');
  });

  const login = (newToken: string) => {
    console.log('[AuthContext] login() called — setting crm_token in localStorage & state');
    localStorage.setItem('crm_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    console.log('[AuthContext] logout() called — clearing crm_token');
    localStorage.removeItem('crm_token');
    setToken(null);
  };

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        token,
        isAuthenticated: !!token,
        login,
        logout,
      },
    },
    children
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    // Fallback behavior if rendered outside AuthProvider
    const token = localStorage.getItem('crm_token');
    return {
      token,
      isAuthenticated: !!token,
      login: (newToken: string) => {
        localStorage.setItem('crm_token', newToken);
      },
      logout: () => {
        localStorage.removeItem('crm_token');
      },
    };
  }

  return context;
}
