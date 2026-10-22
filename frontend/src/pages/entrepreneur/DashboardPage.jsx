import { Link, useOutletContext } from 'react-router';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { formatDate } from '../../utils/format.js';
import { ENTREPRENEUR_LINKS } from '../../utils/constants.js';
import Avatar from '../../components/common/Avatar.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import StatusBadge from '../../components/business/StatusBadge.jsx';
import ZoneBadge from '../../components/business/ZoneBadge.jsx';

export default function DashboardPage() {
  const { business } = useOutletContext();
  const notifications = useApi(({ signal }) => api.get('/notifications', { signal }));
  if (!business) return <Spinner label="Cargando resumen…" />;
  return <div className="grid gap-6">
    <header><h2 className="text-2xl font-bold text-unison-blue">Tu negocio, de un vistazo</h2><p className="mt-2 text-slate-600">Administra tu presencia en el campus desde aquí.</p></header>
    {business.inactivo_oculto && <div role="status" className="surface p-5 bg-unison-gold-soft! text-unison-blue">Tu negocio está oculto por inactividad. Guarda una actualización para volver a mostrarlo en el directorio.</div>}
    <section className="surface p-5 grid gap-4" aria-label="Resumen del negocio">
      <div className="flex gap-3 items-center"><Avatar src={business.foto_perfil_url} name={business.nombre_negocio} categoryId={business.category_id} /><div><h3 className="font-bold text-lg text-unison-blue break-words">{business.nombre_negocio}</h3><p className="text-sm text-slate-600">{business.category_nombre}</p></div></div>
      <div className="flex flex-wrap gap-4"><StatusBadge business={business} /><ZoneBadge business={business} /></div>
      <p className="text-sm text-slate-600">Última actividad: {formatDate(business.last_activity_at)}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[['Productos activos', business.products.filter(item => item.estado === 'activo').length], ['Productos pausados', business.products.filter(item => item.estado === 'pausado').length], ['Productos moderados', business.products.filter(item => item.estado === 'oculto_admin').length]].map(([label, count]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-600">{label}</p><strong className="text-2xl text-unison-blue">{count}</strong></div>)}</div>
      {!business.inactivo_oculto && <Link to={`/negocio/${business.slug}`} className="text-button justify-self-start">Abrir perfil público</Link>}
    </section>
    <nav aria-label="Accesos rápidos" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{ENTREPRENEUR_LINKS.slice(1).map(link => <Link key={link.to} to={link.to} className="surface p-5 min-h-14 font-semibold text-unison-blue hover:bg-slate-100">{link.label} →</Link>)}</nav>
    <section className="surface p-5 grid gap-3"><h3 className="text-xl font-bold text-unison-blue">Notificaciones recientes</h3><ErrorAlert error={notifications.error} onRetry={notifications.refetch} />{notifications.loading ? <Spinner label="Cargando avisos…" /> : !notifications.error && (notifications.data?.items.length ? <ul className="grid gap-3">{notifications.data.items.slice(0, 3).map(item => <li key={item.id} className="border-b border-slate-100 pb-3"><strong>{item.titulo}</strong><p className="text-sm text-slate-600 whitespace-pre-wrap break-words">{item.mensaje}</p></li>)}</ul> : <p className="text-slate-600">No tienes notificaciones.</p>)}<Link className="text-button justify-self-start" to="/panel/notificaciones">Ver todos los avisos</Link></section>
  </div>;
}
