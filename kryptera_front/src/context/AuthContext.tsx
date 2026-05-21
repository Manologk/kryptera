import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AUTH_STORAGE_KEY } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { getMe, login as apiLogin, register as apiRegister } from '@/services/api';
import { isTokenRelatedError } from '@/services/authSession';
import { resetAuthFailureGuard, setAuthBridge } from '@/services/authBridge';
import type { User } from '@/types';

interface AuthState {
  access: string;
  refresh: string;
  user: User;
}

type LoginResult = { ok: true; user: User } | { ok: false; message: string };

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (input: {
    email: string;
    password: string;
    password2: string;
    full_name?: string;
    phone?: string;
  }) => Promise<LoginResult>;
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
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setSession(null);
    persistSession(null);
  }, []);

  const redirectToLogin = useCallback(() => {
    const { pathname, search } = window.location;
    if (pathname === ROUTES.login || pathname === ROUTES.register) return;
    navigate(ROUTES.login, { replace: true, state: { from: `${pathname}${search}` } });
  }, [navigate]);

  const handleAuthFailure = useCallback(() => {
    clearSession();
    redirectToLogin();
  }, [clearSession, redirectToLogin]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const stored = readStoredSession();
      if (!stored?.access) {
        if (!cancelled) {
          setSession(stored);
          setLoading(false);
        }
        return;
      }
      const res = await getMe(stored.access);
      if (cancelled) return;
      if (res.data) {
        const next: AuthState = { ...stored, user: res.data };
        setSession(next);
        persistSession(next);
      } else if (isTokenRelatedError(res.error)) {
        clearSession();
        redirectToLogin();
      } else {
        setSession(stored);
      }
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [clearSession, redirectToLogin]);

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
      onAuthFailure: handleAuthFailure,
    });
    return () => setAuthBridge(null);
  }, [session, handleAuthFailure]);

  const logout = useCallback(() => {
    clearSession();
    resetAuthFailureGuard();
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const res = await apiLogin(email, password);
      if (res.error || !res.data) {
        return { ok: false, message: res.error?.message ?? 'Login failed' };
      }
      const { access, refresh, user } = res.data;
      const next: AuthState = { access, refresh, user };
      setSession(next);
      persistSession(next);
      resetAuthFailureGuard();
      return { ok: true, user };
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
    }): Promise<LoginResult> => {
      const res = await apiRegister(input);
      if (res.error || !res.data) {
        return { ok: false, message: res.error?.message ?? 'Registration failed' };
      }
      const { access, refresh, user } = res.data;
      const next: AuthState = { access, refresh, user };
      setSession(next);
      persistSession(next);
      resetAuthFailureGuard();
      return { ok: true, user };
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    if (!session?.access) return;
    const res = await getMe(session.access);
    if (isTokenRelatedError(res.error)) {
      handleAuthFailure();
      return;
    }
    if (res.error || !res.data) return;
    const next: AuthState = { ...session, user: res.data };
    setSession(next);
    persistSession(next);
  }, [session, handleAuthFailure]);

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
