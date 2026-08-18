import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { onAuthChange, getUserProfile, loginWithEmail, logout as firebaseLogout, resetPassword } from '@/services/firebase/auth';
import type { UserProfile, UserRole } from '@/types';
import { ROLES } from '@/constants/roles';
import { auth } from '@/lib/firebase';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  clearError: () => void;
  hasRole: (role: UserRole) => boolean;
  hasMinRole: (role: UserRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const clearError = useCallback(() => setState(s => ({ ...s, error: null })), []);

  const refreshProfile = useCallback(async () => {
    const { auth: firebaseAuth } = await import('@/lib/firebase');
    const firebaseUser = firebaseAuth?.currentUser;
    if (!firebaseUser) return;
    const profile = await getUserProfile(firebaseUser.uid);
    if (profile) {
      setState(s => ({ ...s, user: profile }));
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            setState({ user: profile, loading: false, error: null });
          } else {
            setState({
              user: {
                uid: firebaseUser.uid,
                email: firebaseUser.email ?? '',
                displayName: firebaseUser.displayName ?? 'User',
                role: 'viewer' as UserRole,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
              loading: false,
              error: null,
            });
          }
        } catch {
          setState({ user: null, loading: false, error: 'Gagal memuat profil pengguna' });
        }
      } else {
        setState({ user: null, loading: false, error: null });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const { profile } = await loginWithEmail(email, password);
      setState({ user: profile, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? translateFirebaseError(err.message) : 'Login gagal';
      setState(s => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await firebaseLogout();
      setState({ user: null, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout gagal';
      setState(s => ({ ...s, error: message }));
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      await resetPassword(email);
      setState(s => ({ ...s, loading: false }));
    } catch (err) {
      const message = err instanceof Error ? translateFirebaseError(err.message) : 'Gagal mengirim email reset';
      setState(s => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }, []);

  const hasRole = useCallback((role: UserRole) => {
    return state.user?.role === role;
  }, [state.user?.role]);

  const hasMinRole = useCallback((role: UserRole) => {
    if (!state.user) return false;
    return ROLES[state.user.role].level >= ROLES[role].level;
  }, [state.user]);

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      forgotPassword,
      clearError,
      hasRole,
      hasMinRole,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function translateFirebaseError(message: string): string {
  if (message.includes('invalid-email')) return 'Format email tidak valid';
  if (message.includes('user-not-found')) return 'Akun tidak ditemukan';
  if (message.includes('wrong-password') || message.includes('invalid-credential')) return 'Password salah';
  if (message.includes('too-many-requests')) return 'Terlalu banyak percobaan. Coba lagi nanti.';
  if (message.includes('network-request-failed')) return 'Koneksi internet terputus';
  return 'Terjadi kesalahan. Silakan coba lagi.';
}
