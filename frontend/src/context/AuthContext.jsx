import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, getToken, setToken as storeToken } from '../services/api.js';
import { TOKEN_KEY, SESSION_EXPIRED_EVENT } from '../utils/constants.js';
import { useToast } from './ToastContext.jsx';
// Conserva la identidad del contexto cuando Vite actualiza los módulos que lo consumen.
const AuthContext = import.meta.hot?.data.authContext ?? createContext(null);
if (import.meta.hot) import.meta.hot.data.authContext = AuthContext;
const emptySession = { user: null, business: null, unread_notifications: 0 };
export function AuthProvider({ children }) {
  const [token, setToken] = useState(getToken);
  const [session, setSession] = useState(emptySession);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(null);
  const generation = useRef(0);
  const toast = useToast();
  const logout = useCallback(() => { generation.current += 1; storeToken(null); setToken(null); setSession(emptySession); setLoading(false); setError(null); }, []);
  const refreshSession = useCallback(async ({ signal } = {}) => {
    const requestedToken = getToken();
    if (!requestedToken) return null;
    const id = ++generation.current;
    setLoading(true); setError(null);
    try {
      const result = await api.get('/auth/me', { signal });
      if (id === generation.current && getToken() === requestedToken && !signal?.aborted) setSession(result.data);
      return result.data;
    } catch (failure) {
      if (failure.name !== 'AbortError' && id === generation.current && getToken() === requestedToken) setError(failure);
      return null;
    } finally {
      if (id === generation.current && !signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const expired = event => {
      if (event.detail.token === getToken()) { logout(); toast.error(event.detail.message); }
    };
    const changed = event => {
      if (event.key !== TOKEN_KEY && event.key !== null) return;
      generation.current += 1;
      const nextToken = event.key === null ? null : event.newValue;
      storeToken(nextToken, { persist: false }); setToken(nextToken); setSession(emptySession); setError(null); setLoading(Boolean(nextToken));
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expired); window.addEventListener('storage', changed);
    return () => { window.removeEventListener(SESSION_EXPIRED_EVENT, expired); window.removeEventListener('storage', changed); };
  }, [logout, toast]);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController(); void refreshSession({ signal: controller.signal });
    return () => controller.abort();
  }, [token, refreshSession]);
  const login = useCallback(async (identificador, password) => {
    const id = ++generation.current;
    const result = await api.post('/auth/login', { identificador, password }, { auth: false });
    if (id !== generation.current) return null;
    const { token: nextToken, ...snapshot } = result.data;
    storeToken(nextToken); setToken(nextToken); setSession(snapshot); setError(null); setLoading(false);
    return result.data;
  }, []);
  const setBusiness = useCallback(business => setSession(previous => ({ ...previous, business })), []);
  const value = useMemo(() => ({ ...session, token, loading, error, isAuthenticated: Boolean(token && session.user), login, logout, refreshSession, setBusiness }), [session, token, loading, error, login, logout, refreshSession, setBusiness]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth requiere AuthProvider.'); return value; }
export default AuthContext;
