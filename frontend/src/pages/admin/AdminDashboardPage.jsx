import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { ADMIN_LINKS } from '../../utils/constants.js';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import Spinner from '../../components/common/Spinner.jsx';

// Listados administrativos de esta fase: filtros, cancelación y paginación comunes.
export function useAdminListing(path, initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const query = useDebounce(filters.q ?? '', 300);
  const params = { ...filters, ...(Object.hasOwn(filters, 'q') ? { q: query.trim() } : {}), page, limit: 24 };
  const key = JSON.stringify(params);
  const resource = useApi(({ signal }) => api.get(path, { params, signal }), { immediate: false });
  useEffect(() => { void resource.execute(); }, [path, key, resource.execute]);
  useEffect(() => {
    if (!resource.loading && resource.meta && page > Math.max(1, resource.meta.total_pages)) setPage(Math.max(1, resource.meta.total_pages));
  }, [resource.loading, resource.meta, page]);
  const changeFilters = patch => { setFilters(previous => ({ ...previous, ...patch })); setPage(1); };
  return { ...resource, filters, changeFilters, page, setPage };
}

export default function AdminDashboardPage() {
  const stats = useApi(({ signal }) => api.get('/admin/stats', { signal }));
  const indicators = [
    ['solicitudes_pendientes', 'Solicitudes pendientes', '/admin/solicitudes'],
    ['cuentas_aprobadas', 'Cuentas aprobadas', '/admin/solicitudes?status=aprobada'],
    ['cuentas_suspendidas', 'Cuentas suspendidas', '/admin/solicitudes?status=suspendida'],
    ['negocios_abiertos', 'Negocios abiertos', '/explorar?open_now=true'],
    ['negocios_inactivos', 'Negocios ocultos por inactividad', '/admin/mantenimiento'],
    ['productos_ocultos', 'Productos ocultos por moderación', '/admin/moderacion?estado=oculto_admin'],
    ['reportes_pendientes', 'Reportes por atender', '/admin/reportes']
  ];
  return <div className="grid gap-6">
    <header><h2 className="text-2xl font-bold text-unison-blue">Resumen de la plataforma</h2><p className="text-slate-600 mt-2">Solicitudes, moderación y actividad de la comunidad.</p></header>
    <button type="button" className="button button-secondary justify-self-start" disabled={stats.loading} onClick={stats.refetch}>Actualizar indicadores</button>
    <ErrorAlert error={stats.error} onRetry={stats.refetch} />
    {stats.loading ? <Spinner label="Cargando indicadores…" /> : !stats.error && stats.data && <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{indicators.map(([key, label, to]) => <Link key={key} to={to} className="surface p-5 grid gap-3 hover:bg-slate-50"><span className="text-slate-600 text-sm">{label}</span><strong className="text-3xl text-unison-blue">{stats.data[key] ?? 0}</strong></Link>)}</section>}
    <nav aria-label="Accesos administrativos" className="grid gap-3 sm:grid-cols-2">{ADMIN_LINKS.slice(1).map(link => <Link key={link.to} to={link.to} className="surface p-5 font-semibold text-unison-blue min-h-14 hover:bg-slate-50">{link.label} →</Link>)}</nav>
  </div>;
}
