import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../utils/db';
import { User } from '../utils/mockDb';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  isSuperAdmin: boolean;
  companyName: string;
  changePasswordModalOpen: boolean;
  setChangePasswordModalOpen: (open: boolean) => void;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [companyName, setCompanyName] = useState<string>('');
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState<boolean>(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await db.auth.getCurrentUser();
        setUser(currentUser);
        if (currentUser) {
          await fetchCompanyName(currentUser.company_id);
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const fetchCompanyName = async (companyId: string) => {
    try {
      const company = await db.companies.get(companyId);
      setCompanyName(company ? company.name : 'Unknown Agency');
    } catch {
      setCompanyName('My Agency');
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const loggedInUser = await db.auth.login(email, password);
      setUser(loggedInUser);
      await fetchCompanyName(loggedInUser.company_id);
      return loggedInUser;
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await db.auth.logout();
      setUser(null);
      setCompanyName('');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (password: string): Promise<void> => {
    try {
      await db.auth.updatePassword(password);
      if (user) {
        setUser({
          ...user,
          is_default_password: false,
        });
      }
    } catch (err) {
      console.error('Update password error:', err);
      throw err;
    }
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAdmin,
      isManager,
      isStaff,
      isSuperAdmin,
      companyName,
      changePasswordModalOpen,
      setChangePasswordModalOpen,
      updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
