'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@foldify/shared';
import { useIsHydrated } from '@/app/lib/hooks';
import * as api from '@/app/lib/api-client';

interface AuthContextValue {
  user: User | null;
  /**
   * Starts `true` and stays true until the session check finishes.
   * Consumers MUST render a loading state rather than a signed-out state
   * while this is true, or every page flashes "Sign in" for a moment on load.
   */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isHydrated = useIsHydrated();

  /**
   * Restore the session on mount. Everything goes through api-client — no
   * component in this app calls fetch directly.
   *
   * `isLoading` already starts true, so nothing is set synchronously here:
   * every setState is inside a promise callback. `isStale` stops a slow
   * response writing state into a provider that has already unmounted.
   */
  useEffect(() => {
    let isStale = false;

    api
      .getCurrentUser()
      .then((current) => {
        // An anonymous visitor is a normal outcome, not an error.
        if (!isStale) setUser(current);
      })
      .catch(() => {
        if (!isStale) setUser(null);
      })
      .finally(() => {
        if (!isStale) setIsLoading(false);
      });

    return () => {
      isStale = true;
    };
  }, []);

  /** Re-check the session on demand, e.g. after an action that may have changed it. */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setUser(await api.getCurrentUser());
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Deliberately lets ApiClientError through: the form needs error.fields
    // to highlight the offending input.
    setUser(await api.login({ email, password }));
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setUser(await api.register({ name, email, password }));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      // Clear locally even if the request failed — the user asked to be out.
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      /*
       * Stays true until hydration, on top of the session check itself.
       *
       * This provider sits outside the Suspense boundaries the pages use, so it
       * mounts and resolves the session BEFORE a suspended subtree hydrates.
       * A consumer in that subtree would then render its signed-out branch
       * against server HTML that still says "loading" — a hydration mismatch.
       * Reporting "not known yet" until the client has caught up keeps the
       * first client render identical to the server's.
       */
      isLoading: !isHydrated || isLoading,
      login,
      register,
      logout,
      refresh,
    }),
    [user, isHydrated, isLoading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
