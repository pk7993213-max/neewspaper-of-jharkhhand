import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/config';
import { StaffUser } from '../types';
import { getPermissionsForRole, RolePermissions } from '../utils/permissions';
import {
  syncUserProfile,
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  logoutStaff,
} from '../firebase/services/auth';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  staffUser: StaffUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isReporter: boolean;
  permissions: RolePermissions;
  loginGoogle: () => Promise<StaffUser>;
  loginEmail: (email: string, pass: string) => Promise<StaffUser>;
  registerEmail: (email: string, pass: string, name: string) => Promise<StaffUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (u: FirebaseUser) => {
    try {
      const profile = await syncUserProfile(u);
      setStaffUser(profile);
    } catch (err) {
      console.error('Failed to sync staff profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setFirebaseUser(user);
      if (user) {
        await fetchProfile(user);
      } else {
        setStaffUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (firebaseUser) {
      await fetchProfile(firebaseUser);
    }
  };

  const handleLoginGoogle = async () => {
    const user = await loginWithGoogle();
    setStaffUser(user);
    return user;
  };

  const handleLoginEmail = async (email: string, pass: string) => {
    const user = await loginWithEmail(email, pass);
    setStaffUser(user);
    return user;
  };

  const handleRegisterEmail = async (email: string, pass: string, name: string) => {
    const user = await registerWithEmail(email, pass, name);
    setStaffUser(user);
    return user;
  };

  const handleLogout = async () => {
    await logoutStaff();
    setStaffUser(null);
  };

  const role = staffUser?.role;
  const isAdmin = role === 'admin';
  const isEditor = role === 'editor' || isAdmin;
  const isReporter = role === 'reporter' || isEditor;
  const permissions = getPermissionsForRole(role);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        staffUser,
        isLoading,
        isAdmin,
        isEditor,
        isReporter,
        permissions,
        loginGoogle: handleLoginGoogle,
        loginEmail: handleLoginEmail,
        registerEmail: handleRegisterEmail,
        logout: handleLogout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
