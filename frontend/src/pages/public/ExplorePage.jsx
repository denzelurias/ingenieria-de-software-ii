import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { SlidersHorizontal, Sparkles, ShieldCheck, MapPin } from 'lucide-react';
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
  return <div className="grid gap-6">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-brand-bg-blue/45 via-white to-brand-bg-light border border-slate-200/90 p-5 sm:p-8 lg:p-10 shadow-sm">
      <div aria-hidden="true" className="absolute -top-24 -left-24 w-80 h-80 bg-brand-cobalt/15 rounded-full blur-3xl pointer-events-none" />
      <div aria-hidden="true" className="absolute top-1/3 -right-24 w-80 h-80 bg-brand-gold/20 rounded-full blur-3xl pointer-events-none" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        <div className="lg:col-span-7 space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white rounded-full shadow-xs border border-brand-navy/15 transform -rotate-1 hover:rotate-0 transition-transform">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-gold animate-pulse" aria-hidden="true" />
            <span className="eyebrow">DIRECTORIO ESTUDIANTIL · UNISON</span>
            <span className="text-xs text-slate-400 font-semibold hidden sm:inline">· Hermosillo / Sonora</span>
          </div>
          <div className="space-y-3">
            <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-black text-brand-navy leading-[1.08] tracking-tight">
              Descubre lo que nace{' '}
              <span className="relative inline-block text-brand-gold-deep font-black">
                en tu campus.
                <svg className="absolute -bottom-2 left-0 w-full h-3.5 text-brand-gold pointer-events-none" viewBox="0 0 250 20" fill="none" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3 13C35 4 80 18 120 11C160 4 200 17 247 9" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
              Negocios, productos y talento de nuestra comunidad. Contacta directamente a quien lo crea y acuerda entregas en tu facultad o zona del campus.
            </p>
          </div>
          <div className="ticket-box w-full bg-white p-3.5 sm:p-4 rounded-2xl shadow-xl border border-slate-200">
            <SearchBar value={values.q ?? ''} onChange={q => change({ q }, { replace: true })} mode={mode} onModeChange={changeMode} />
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600 font-semibold">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-gold-pale/70 text-[#002D62] font-bold">
              <ShieldCheck size={15} aria-hidden="true" />
              Emprendedores verificados UNISON
            </span>
            <span className="inline-flex items-center gap-1.5 text-brand-navy font-bold">
              <Sparkles size={15} className="text-brand-gold-deep" aria-hidden="true" />
              Contacto directo por WhatsApp, teléfono o redes
            </span>
          </div>
        </div>
        <div aria-hidden="true" className="hidden lg:flex lg:col-span-5 relative min-h-[300px] items-center justify-center">
          <div className="relative w-72 bg-white p-5 rounded-2xl shadow-2xl border-2 border-brand-navy/15 transform -rotate-2 hover:rotate-0 transition-transform duration-500 z-20">
            <div className=" absolute -top-3 left-1/2 -translate-x-1/2 washi-tape w-24 h-5 z-30" />
            <div className="rounded-xl bg-gradient-to-br from-brand-navy to-brand-cobalt p-4 text-white mb-3 shadow-inner">
              <span className="inline-block bg-brand-gold text-[#002D62] font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase">🦉 Comunidad Búho</span>
              <p className="font-heading text-lg font-black mt-2 leading-tight">Talento universitario en cada zona</p>
              <p className="text-[11px] text-blue-100 mt-1">Repostería, asesorías, diseño, tecnología y más</p>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-green-800 bg-green-100 font-bold px-2.5 py-1 rounded-full text-[10px]">● En vivo en campus</span>
              <span className="font-heading font-extrabold text-brand-navy">Trato directo</span>
            </div>
          </div>
          <div className="absolute -top-2 right-2 bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-brand-bg-blue w-44 transform rotate-6 z-30">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-gold-pale text-[#002D62] flex items-center justify-center font-black text-xs">UN</div>
              <div className="text-[11px] leading-tight">
                <p className="font-bold text-brand-navy">100% Verificado</p>
                <p className="text-slate-500 text-[10px]">Credencial vigente</p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-3 left-2 bg-white/95 backdrop-blur-md p-2.5 rounded-xl shadow-lg border border-brand-gold/40 w-44 transform -rotate-6 z-30">
            <div className="washi-blue absolute -top-2 left-6 w-16 h-3.5" />
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-brand-navy" />
              <div className="text-[11px] leading-tight">
                <p className="font-bold text-brand-navy">Zonas del Campus</p>
                <p className="text-brand-gold-deep font-black text-[10px]">Mapa esquemático</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
    <ErrorAlert error={catalogs.error} onRetry={catalogs.refetch} />{catalogs.loading && <Spinner label="Cargando categorías y zonas…" />}<CategoryChips categories={catalogs.data?.categories} value={values.category_id} onChange={category_id => change({ category_id })} /><div className="flex flex-wrap items-center gap-3 justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs"><div className="flex flex-wrap items-center gap-2.5"><button type="button" className="button button-secondary" onClick={() => setDrawer(true)}><SlidersHorizontal size={17} aria-hidden="true" />Filtros</button><button type="button" className={`button ${values.open_now === 'true' ? 'button-primary' : 'button-secondary'}`} aria-pressed={values.open_now === 'true'} onClick={() => change({ open_now: values.open_now === 'true' ? '' : 'true' })}>{values.open_now === 'true' && <span className="animate-pulse text-green-300" aria-hidden="true">●</span>}Solo abiertos ahora</button><button className="text-button px-2!" type="button" onClick={clear}>Limpiar filtros</button></div><SortSelector mode={mode} value={values.sort || 'open_now'} onChange={sort => change({ sort, preferred_zone_id: sort === 'proximity' ? values.preferred_zone_id || '' : '' })} /></div>
    <details className="surface p-4"><summary className="cursor-pointer min-h-11 flex items-center font-heading font-bold text-brand-navy">Seleccionar zona del campus{values.zone_id ? ' · Filtro activo' : ''}</summary><CampusZoneSelector zones={catalogs.data?.campus_zones} value={values.zone_id ?? ''} onChange={zone_id => change({ zone_id })} /></details>
    {mode === 'businesses' && values.sort === 'proximity' && <div className="surface p-4"><label className="field-label">Mi zona de referencia<select className="w-full mt-2" value={values.preferred_zone_id ?? ''} onChange={event => change({ preferred_zone_id: event.target.value })}><option value="">Selecciona una zona fija</option>{catalogs.data?.campus_zones.filter(zone => zone.mapa_x != null && zone.mapa_y != null).map(zone => <option key={zone.id} value={zone.id}>{zone.nombre}</option>)}</select></label>{!values.preferred_zone_id && <p className="field-hint">Sin una zona fija se muestran abiertos primero. La cercanía usa zonas aproximadas del campus.</p>}</div>}
    <FilterDrawer open={drawer} onClose={() => setDrawer(false)} values={values} onChange={change} zones={catalogs.data?.campus_zones} mode={mode} onClear={clear} />
    <section aria-label="Resultados" aria-busy={results.loading} className="min-h-48"><ErrorAlert message={invalid} /><ErrorAlert error={invalid ? null : results.error} onRetry={results.refetch} />{!invalid && (results.loading || results.data === null && !results.error) ? <div className="page-loader"><Spinner label="Buscando en el campus…" /></div> : !invalid && !results.error && <><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-5"><div className="flex items-center gap-2 text-xs font-bold text-brand-navy"><span className="relative flex h-2.5 w-2.5" aria-hidden="true"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-gold" /></span><span>DIRECTORIO ACTIVO</span></div><p className="text-sm font-semibold text-slate-600" role="status">{results.meta?.total ?? 0} {mode === 'products' ? 'productos' : 'negocios'} encontrados</p></div>{results.data?.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{results.data.map(item => mode === 'products' ? <ProductCard key={item.id} product={item} /> : <BusinessCard key={item.id} business={item} />)}</div> : <EmptyState title="No encontramos resultados" description="Prueba otra búsqueda o amplía tus filtros." action={<button className="button button-primary" type="button" onClick={clear}>Limpiar filtros</button>} />}<Pagination page={results.meta?.page ?? 1} totalPages={results.meta?.total_pages} disabled={results.loading} onPageChange={page => { change({ page }, { page: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} /></>}</section></div>;
}
