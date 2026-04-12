import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AUTH_STORAGE_KEY } from '@/constants';
import { getMe, login as apiLogin, register as apiRegister } from '@/services/api';
import { setAuthBridge } from '@/services/authBridge';
import type { User } from '@/types';

interface AuthState {
  access: string;
  refresh: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  register: (input: {
    email: string;
    password: string;
    password2: string;
    full_name?: string;
    phone?: string;
  }) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): AuthState | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    if (
      typeof parsed.access === 'string' &&
      typeof parsed.refresh === 'string' &&
      parsed.user &&
      typeof parsed.user.id === 'number'
    ) {
      return parsed as AuthState;
    }
    return null;
  } catch {
    return null;
  }
}

function persistSession(state: AuthState | null) {
  if (!state) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readStoredSession();
    setSession(stored);
    setLoading(false);
  }, []);

  useEffect(() => {
    setAuthBridge({
      getAccess: () => session?.access ?? null,
      getRefresh: () => session?.refresh ?? null,
      setAccess: (access: string) => {
        setSession(s => {
          if (!s) return s;
          const next = { ...s, access };
          persistSession(next);
          return next;
        });
      },
    });
    return () => setAuthBridge(null);
  }, [session]);

  const logout = useCallback(() => {
    setSession(null);
    persistSession(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: true } | { ok: false; message: string }> => {
      const res = await apiLogin(email, password);
      if (res.error || !res.data) {
        return { ok: false, message: res.error?.message ?? 'Login failed' };
      }
      const { access, refresh, user } = res.data;
      const next: AuthState = { access, refresh, user };
      setSession(next);
      persistSession(next);
      return { ok: true };
    },
    [],
  );

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      password2: string;
      full_name?: string;
      phone?: string;
    }): Promise<{ ok: true } | { ok: false; message: string }> => {
      const res = await apiRegister(input);
      if (res.error || !res.data) {
        return { ok: false, message: res.error?.message ?? 'Registration failed' };
      }
      const { access, refresh, user } = res.data;
      const next: AuthState = { access, refresh, user };
      setSession(next);
      persistSession(next);
      return { ok: true };
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    if (!session?.access) return;
    const res = await getMe(session.access);
    if (res.error || !res.data) return;
    const next: AuthState = { ...session, user: res.data };
    setSession(next);
    persistSession(next);
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.access ?? null,
      refreshToken: session?.refresh ?? null,
      isAuthenticated: Boolean(session?.access),
      loading,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [session, loading, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
