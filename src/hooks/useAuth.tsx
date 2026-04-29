import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────
interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Helpers ───────────────────────────────────────────────────

/** Get the stored access token (from Supabase's localStorage entry). */
function getStoredToken(): string | null {
  try {
    // Supabase stores session under a key like sb-<ref>-auth-token
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          return parsed?.access_token || null;
        }
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

// ── Provider ──────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  // ── Restore session on mount ────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    async function restoreSession() {
      try {
        // Check if Supabase has a stored session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          if (!mountedRef.current) return;

          const mappedUser: User = {
            id: session.user.id,
            email: session.user.email ?? '',
            full_name:
              session.user.user_metadata?.full_name ??
              session.user.email?.split('@')[0] ??
              '',
            avatar_url: session.user.user_metadata?.avatar_url ?? null,
          };
          setUser(mappedUser);

          // Enrich from profiles table (best-effort)
          try {
            const token = session.access_token;
            const res = await fetch(`${API_BASE}/api/auth/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              if (mountedRef.current && data.user) {
                setUser({
                  id: data.user.id,
                  email: data.user.email,
                  full_name: data.user.full_name || mappedUser.full_name,
                  avatar_url: data.user.avatar_url || mappedUser.avatar_url,
                });
              }
            }
          } catch {
            // Profile fetch failed — continue with metadata
          }
        }
      } catch (err) {
        console.error('Session restore failed:', err);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    }

    restoreSession();

    // Listen for Supabase auth state changes (token refresh, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mountedRef.current) return;

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? '',
            full_name:
              session.user.user_metadata?.full_name ??
              session.user.email?.split('@')[0] ??
              '',
            avatar_url: session.user.user_metadata?.avatar_url ?? null,
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Login ───────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Call backend API for login
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Set the session on the Supabase client so it persists
      // and onAuthStateChange fires
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      // Set user from API response (includes profile data)
      setUser({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.full_name,
        avatar_url: data.user.avatar_url,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Signup ──────────────────────────────────────────────────
  const signup = useCallback(
    async (email: string, password: string, fullName: string) => {
      setIsLoading(true);
      try {
        // Call backend API for signup (creates user + profile + categories)
        const res = await fetch(`${API_BASE}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, fullName }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Signup failed');
        }

        // If the backend returned session tokens, set them
        if (data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          setUser({
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.full_name,
            avatar_url: null,
          });
        } else {
          // No session — user needs to confirm email or log in manually
          throw new Error(
            data.message || 'Account created. Please log in.'
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ── Logout ──────────────────────────────────────────────────
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getStoredToken();

      // Notify backend (best-effort)
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      } catch {
        // Backend logout is best-effort
      }

      // Sign out from Supabase client (clears localStorage)
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
