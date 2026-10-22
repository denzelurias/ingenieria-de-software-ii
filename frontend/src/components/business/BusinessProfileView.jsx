import { useState } from 'react';
import Avatar from '../common/Avatar.jsx';
import EmptyState from '../common/EmptyState.jsx';
import StatusBadge from './StatusBadge.jsx';
import ZoneBadge from './ZoneBadge.jsx';
import ContactButtons from './ContactButtons.jsx';
import ScheduleTable from './ScheduleTable.jsx';
import ProductCard from '../product/ProductCard.jsx';
import PriceRangeFilter from '../product/PriceRangeFilter.jsx';

// Solo presentación: datos y acciones llegan por props; no consulta API ni contextos.
export default function BusinessProfileView({ business, currentDay, isFavorite = false, onToggleFavorite, onOpenMenu, onReport }) {
  const [tab, setTab] = useState('catalogo'); const [query, setQuery] = useState(''); const [prices, setPrices] = useState({ min_price: '', max_price: '' });
  const normalize = value => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es-MX');
  const products = (business.products ?? []).filter(item => ['activo', 'pausado'].includes(item.estado) && normalize(`${item.nombre} ${item.descripcion}`).includes(normalize(query)) && (prices.min_price === '' || item.precio >= Number(prices.min_price)) && (prices.max_price === '' || item.precio <= Number(prices.max_price))).sort((a, b) => Number(a.estado === 'pausado') - Number(b.estado === 'pausado'));
  return <div className="grid gap-6"><header className="surface p-4 md:p-6"><div className="flex items-center gap-3 mb-3"><Avatar name={business.nombre_negocio} src={business.foto_perfil_url} size={56} /><div className="min-w-0"><span className="eyebrow">{business.category_nombre}</span><h1 className="text-2xl md:text-3xl font-bold text-unison-blue break-words">{business.nombre_negocio}</h1></div></div><div className="flex flex-wrap gap-3 mb-3"><StatusBadge business={business} /><ZoneBadge business={business} /></div><ContactButtons contacts={business.contacts} businessName={business.nombre_negocio} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} /><p className="mt-4 text-slate-600 whitespace-pre-wrap break-words">{business.descripcion}</p>{(business.mostrar_ubicacion === true || business.mostrar_ubicacion === 1) && business.ubicacion_detalle && <p className="mt-3 text-sm">Referencia: {business.ubicacion_detalle}</p>}</header>
    <nav aria-label="Contenido del negocio" className="flex flex-wrap gap-2">{[['catalogo', 'Productos'], ['menu', 'Foto del menú'], ['horarios', 'Horarios e información']].map(([value, label]) => <button key={value} type="button" className={`button ${tab === value ? 'button-primary' : 'button-secondary'}`} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</nav>
    {tab === 'catalogo' && <section aria-label="Catálogo" className="grid gap-5"><div className="grid gap-4 md:grid-cols-2"><label className="field-label">Buscar en este negocio<input type="search" className="w-full mt-2" placeholder="Producto o descripción" value={query} onChange={event => setQuery(event.target.value)} /></label><PriceRangeFilter min={prices.min_price} max={prices.max_price} onChange={change => setPrices(previous => ({ ...previous, ...change }))} /></div>{products.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{products.map(product => <ProductCard key={product.id} product={product} onReport={onReport} />)}</div> : <EmptyState title="Sin productos para mostrar" description="Prueba otra búsqueda o consulta directamente al negocio." />}</section>}
    {tab === 'menu' && <section className="surface p-5">{business.foto_menu_url ? <button type="button" className="block w-full text-left" onClick={() => onOpenMenu?.(business.foto_menu_url)} aria-label="Ampliar foto del menú"><span className="button button-secondary mb-4">Ampliar menú</span><img src={business.foto_menu_url} alt={`Menú de ${business.nombre_negocio}`} className="max-h-96 mx-auto object-contain" /></button> : <EmptyState title="Sin foto del menú" description="Puedes consultar los productos o contactar al negocio." />}</section>}
    {tab === 'horarios' && <section className="surface p-5"><ScheduleTable schedules={business.schedules} currentDay={currentDay} /><p className="field-hint">El horario habitual es informativo. El estado Abierto/Cerrado lo actualiza el emprendedor.</p><div className="mt-4"><ZoneBadge business={business} /></div></section>}
    {onReport && <button type="button" className="text-button justify-self-start text-left" onClick={() => onReport()}>¿Información falsa o contenido inapropiado? Reportar este negocio</button>}
  </div>;
}
