import { useRef, useState } from 'react';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../utils/format.js';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Spinner from '../../components/common/Spinner.jsx';

export default function NotificationsPage() {
  const auth = useAuth(); const toast = useToast(); const inFlight = useRef(false);
  const resource = useApi(({ signal }) => api.get('/notifications', { signal }));
  const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  const markRead = async id => {
    if (inFlight.current) return; inFlight.current = true; setBusy(true); setError(null);
    try {
      await api.patch(id ? `/notifications/${id}/read` : '/notifications/read-all');
      await resource.refetch(); toast.success(id ? 'Notificación marcada como leída.' : 'Todas las notificaciones están leídas.');
      await auth.refreshSession();
    } catch (failure) { setError(failure); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <div className="grid gap-5">
    <header className="flex flex-wrap justify-between items-center gap-4"><div><h2 className="text-2xl font-bold text-unison-blue">Notificaciones</h2><p className="text-slate-600 mt-2">{resource.data?.unread_count ?? auth.unread_notifications} sin leer · Se muestran los últimos 50 avisos.</p></div><button className="button button-primary" type="button" disabled={busy || resource.loading || !resource.data?.unread_count} onClick={() => markRead()}>Marcar todas como leídas</button></header>
    <ErrorAlert error={resource.error} onRetry={resource.refetch} /><ErrorAlert error={error} />
    {resource.loading ? <Spinner label="Cargando notificaciones…" /> : !resource.error && (resource.data?.items.length ? <ul className="grid gap-4">{resource.data.items.map(item => <li key={item.id} className={`surface p-5 grid gap-3 ${item.leida ? '' : 'border-l-4! border-l-unison-blue!'}`}>
      <div className="flex justify-between flex-wrap gap-2"><h3 className="font-bold text-unison-blue break-words">{item.titulo}</h3><span className="text-sm text-slate-600">{item.leida ? 'Leída' : 'Sin leer'}</span></div><p className="whitespace-pre-wrap break-words">{item.mensaje}</p><time className="text-sm text-slate-600" dateTime={item.created_at}>{formatDate(item.created_at)}</time>
      {!item.leida && <button type="button" className="button button-secondary justify-self-start" disabled={busy} onClick={() => markRead(item.id)}>Marcar como leída</button>}
    </li>)}</ul> : <EmptyState title="Sin notificaciones" description="Aquí verás avisos sobre tu cuenta, productos y actividad." />)}
  </div>;
}
