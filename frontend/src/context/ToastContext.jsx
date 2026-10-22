import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CircleCheck, CircleAlert, Info, X } from 'lucide-react';
const ToastContext = import.meta.hot?.data.toastContext ?? createContext(null);
if (import.meta.hot) import.meta.hot.data.toastContext = ToastContext;
function Toast({ toast, dismiss }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || toast.duration === 0) return;
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast, dismiss, paused]);
  const Icon = toast.type === 'error' ? CircleAlert : toast.type === 'success' ? CircleCheck : Info;
  return <div className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <Icon size={21} aria-hidden="true" /><p>{toast.message}</p>
    <button type="button" className="icon-button" onClick={() => dismiss(toast.id)} aria-label="Cerrar notificación"><X size={18} aria-hidden="true" /></button>
  </div>;
}
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback(id => setToasts(items => items.filter(item => item.id !== id)), []);
  const showToast = useCallback((message, { type = 'info', duration = 6000 } = {}) => {
    const id = crypto.randomUUID();
    const toast = { id, message: typeof message === 'string' ? message : 'No se pudo completar la acción.', type: ['success', 'error', 'info'].includes(type) ? type : 'info', duration };
    setToasts(items => [...items.slice(-3), toast]); return id;
  }, []);
  const value = useMemo(() => ({ showToast, dismiss, success: message => showToast(message, { type: 'success' }), error: message => showToast(message, { type: 'error', duration: 8000 }) }), [showToast, dismiss]);
  return <ToastContext.Provider value={value}>{children}<div className="toast-region" aria-label="Notificaciones">{toasts.map(toast => <Toast key={toast.id} toast={toast} dismiss={dismiss} />)}</div></ToastContext.Provider>;
}
export function useToast() { const value = useContext(ToastContext); if (!value) throw new Error('useToast requiere ToastProvider.'); return value; }
export default ToastContext;
