import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { SlidersHorizontal } from 'lucide-react';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import BusinessCard from '../../components/business/BusinessCard.jsx';
import ProductCard from '../../components/product/ProductCard.jsx';
import SearchBar from '../../components/search/SearchBar.jsx';
import CategoryChips from '../../components/search/CategoryChips.jsx';
import SortSelector from '../../components/search/SortSelector.jsx';
import FilterDrawer from '../../components/search/FilterDrawer.jsx';
import CampusZoneSelector from '../../components/search/CampusZoneSelector.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import Pagination from '../../components/common/Pagination.jsx';

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams(); const key = searchParams.toString();
  const values = Object.fromEntries(searchParams); const mode = values.mode === 'products' ? 'products' : 'businesses';
  const [drawer, setDrawer] = useState(false);
  const catalogs = useApi(({ signal }) => api.get('/catalogs', { signal, auth: false }));
  const params = Object.fromEntries(['q', 'category_id', 'zone_id', 'open_now', 'min_price', 'max_price', 'sort', 'page', 'limit', ...(mode === 'businesses' ? ['day_of_week', 'time', 'available_now', 'preferred_zone_id'] : [])].filter(name => values[name] !== undefined).map(name => [name, values[name]]));
  const invalid = values.q?.length === 1 ? 'Escribe al menos 2 caracteres para buscar.' : values.min_price !== undefined && values.max_price !== undefined && Number(values.min_price) > Number(values.max_price) ? 'El precio máximo debe ser mayor o igual al mínimo.' : null;
  const results = useApi(({ signal }) => api.get(`/${mode}`, { params, signal, auth: false }), { immediate: false });
  useEffect(() => { if (!invalid) void results.execute(); }, [key, invalid, results.execute]);
  useEffect(() => { if (invalid) return; const timer = setInterval(() => { if (document.visibilityState === 'visible') void results.execute(); }, 60000); return () => clearInterval(timer); }, [key, invalid, results.execute]);
  const change = (patch, { page = false, replace = false } = {}) => {
    setSearchParams(previous => { const next = new URLSearchParams(previous); if (!page) next.delete('page'); for (const [name, value] of Object.entries(patch)) { if (value === '' || value == null) next.delete(name); else next.set(name, String(value)); } return next; }, { replace });
  };
  const changeMode = next => change({ mode: next === 'businesses' ? '' : next, sort: '', preferred_zone_id: '', day_of_week: '', time: '', available_now: '' });
  const clear = () => setSearchParams(mode === 'products' ? { mode: 'products' } : {});
  return <div className="grid gap-5"><header className="grid gap-3"><span className="eyebrow">DIRECTORIO ESTUDIANTIL · UNISON</span><h1 className="text-3xl md:text-5xl font-heading text-unison-blue">Descubre lo que nace en tu campus.</h1><p className="text-slate-600">Negocios, productos y talento de nuestra comunidad. Contacta directamente a quien lo crea.</p></header><SearchBar value={values.q ?? ''} onChange={q => change({ q }, { replace: true })} mode={mode} onModeChange={changeMode} /><ErrorAlert error={catalogs.error} onRetry={catalogs.refetch} />{catalogs.loading && <Spinner label="Cargando categorías y zonas…" />}<CategoryChips categories={catalogs.data?.categories} value={values.category_id} onChange={category_id => change({ category_id })} /><div className="flex flex-wrap items-center gap-3 justify-between"><div className="flex flex-wrap items-center gap-3"><button type="button" className="button button-secondary" onClick={() => setDrawer(true)}><SlidersHorizontal size={18} aria-hidden="true" />Filtros</button><button type="button" className={`button ${values.open_now === 'true' ? 'button-primary' : 'button-secondary'}`} aria-pressed={values.open_now === 'true'} onClick={() => change({ open_now: values.open_now === 'true' ? '' : 'true' })}>{values.open_now === 'true' && <span className="animate-pulse text-green-300" aria-hidden="true">●</span>}Solo abiertos ahora</button><button className="text-button" type="button" onClick={clear}>Limpiar filtros</button></div><SortSelector mode={mode} value={values.sort || 'open_now'} onChange={sort => change({ sort, preferred_zone_id: sort === 'proximity' ? values.preferred_zone_id || '' : '' })} /></div>
    <details className="surface p-4"><summary className="cursor-pointer min-h-11 flex items-center font-semibold text-unison-blue">Seleccionar zona del campus{values.zone_id ? ' · Filtro activo' : ''}</summary><CampusZoneSelector zones={catalogs.data?.campus_zones} value={values.zone_id ?? ''} onChange={zone_id => change({ zone_id })} /></details>
    {mode === 'businesses' && values.sort === 'proximity' && <div className="surface p-4"><label className="field-label">Mi zona de referencia<select className="w-full mt-2" value={values.preferred_zone_id ?? ''} onChange={event => change({ preferred_zone_id: event.target.value })}><option value="">Selecciona una zona fija</option>{catalogs.data?.campus_zones.filter(zone => zone.mapa_x != null && zone.mapa_y != null).map(zone => <option key={zone.id} value={zone.id}>{zone.nombre}</option>)}</select></label>{!values.preferred_zone_id && <p className="field-hint">Sin una zona fija se muestran abiertos primero. La cercanía usa zonas aproximadas del campus.</p>}</div>}
    <FilterDrawer open={drawer} onClose={() => setDrawer(false)} values={values} onChange={change} zones={catalogs.data?.campus_zones} mode={mode} onClear={clear} />
    <section aria-label="Resultados" aria-busy={results.loading} className="min-h-48"><ErrorAlert message={invalid} /><ErrorAlert error={invalid ? null : results.error} onRetry={results.refetch} />{!invalid && (results.loading || results.data === null && !results.error) ? <div className="page-loader"><Spinner label="Buscando en el campus…" /></div> : !invalid && !results.error && <><p className="text-sm text-slate-600 mb-4" role="status">{results.meta?.total ?? 0} {mode === 'products' ? 'productos' : 'negocios'} encontrados</p>{results.data?.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{results.data.map(item => mode === 'products' ? <ProductCard key={item.id} product={item} /> : <BusinessCard key={item.id} business={item} />)}</div> : <EmptyState title="No encontramos resultados" description="Prueba otra búsqueda o amplía tus filtros." action={<button className="button button-primary" type="button" onClick={clear}>Limpiar filtros</button>} />}<Pagination page={results.meta?.page ?? 1} totalPages={results.meta?.total_pages} disabled={results.loading} onPageChange={page => { change({ page }, { page: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} /></>}</section></div>;
}
