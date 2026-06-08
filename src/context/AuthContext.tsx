import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../utils/db';
import { User } from '../utils/mockDb';

export interface UserPermissions {
  canViewFinance: boolean;
  canManageSales: boolean;
  canManageProjects: boolean;
  canManageTeam: boolean;
}

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
  companyLogoUrl: string;
  crmName: string;
  changePasswordModalOpen: boolean;
  setChangePasswordModalOpen: (open: boolean) => void;
  updatePassword: (password: string) => Promise<void>;
  permissions: UserPermissions;
  customRoleName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [companyName, setCompanyName] = useState<string>('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string>('');
  const [crmName, setCrmName] = useState<string>('');
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState<boolean>(false);
  const [permissions, setPermissions] = useState<UserPermissions>({
    canViewFinance: false,
    canManageSales: false,
    canManageProjects: false,
    canManageTeam: false
  });
  const [customRoleName, setCustomRoleName] = useState<string>('');

  const getDefaultPermissions = (role: 'superadmin' | 'admin' | 'manager' | 'staff'): UserPermissions => {
    if (role === 'superadmin' || role === 'admin') {
      return {
        canViewFinance: true,
        canManageSales: true,
        canManageProjects: true,
        canManageTeam: true
      };
    }
    if (role === 'manager') {
      return {
        canViewFinance: false,
        canManageSales: true,
        canManageProjects: true,
        canManageTeam: false
      };
    }
    return {
      canViewFinance: false,
      canManageSales: false,
      canManageProjects: true,
      canManageTeam: false
    };
  };

  useEffect(() => {
    async function resolvePermissionsAndRole() {
      if (user) {
        if (user.custom_role_id) {
          try {
            const roles = await db.customRoles.list();
            const role = roles.find(r => r.id === user.custom_role_id);
            if (role) {
              setPermissions({
                canViewFinance: role.can_view_finance,
                canManageSales: role.can_manage_sales,
                canManageProjects: role.can_manage_projects,
                canManageTeam: role.can_manage_team
              });
              setCustomRoleName(role.name);
              return;
            }
          } catch (err) {
            console.error('Error loading custom role permissions:', err);
          }
        }
        setPermissions(getDefaultPermissions(user.role));
        setCustomRoleName('');
      } else {
        setPermissions({
          canViewFinance: false,
          canManageSales: false,
          canManageProjects: false,
          canManageTeam: false
        });
        setCustomRoleName('');
      }
    }
    resolvePermissionsAndRole();
  }, [user]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await db.auth.getCurrentUser();
        setUser(currentUser);
        if (currentUser) {
          let companyId = currentUser.company_id;
          if (currentUser.role === 'superadmin') {
            const impersonatedId = localStorage.getItem('crm_impersonated_company_id');
            if (impersonatedId) {
              companyId = impersonatedId;
            }
          }
          await fetchCompanyName(companyId);
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
      setCompanyLogoUrl(company?.logo_url || '');
      setCrmName(company?.crm_name || '');
    } catch {
      setCompanyName('My Agency');
      setCompanyLogoUrl('');
      setCrmName('');
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const loggedInUser = await db.auth.login(email, password);
      setUser(loggedInUser);
      await fetchCompanyName(loggedInUser.company_id);
      return loggedInUser;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await db.auth.logout();
      setUser(null);
      setCompanyName('');
      setCompanyLogoUrl('');
      setCrmName('');
    } catch (err) {
      console.error('Logout error:', err);
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

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isManager = user?.role === 'manager' || user?.role === 'admin' || user?.role === 'superadmin';
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
      companyLogoUrl,
      crmName,
      changePasswordModalOpen,
      setChangePasswordModalOpen,
      updatePassword,
      permissions,
      customRoleName,
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
