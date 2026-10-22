import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { useAdminListing } from './AdminDashboardPage.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import Pagination from '../../components/common/Pagination.jsx';

const states = { activo: 'Activo', pausado: 'Pausado', oculto_admin: 'Oculto por administración' };
export default function ModerationProductsPage() {
  const [search] = useSearchParams();
  const listing = useAdminListing('/admin/products', { q: '', estado: Object.hasOwn(states, search.get('estado')) ? search.get('estado') : '', business_id: '' });
  const [selected, setSelected] = useState(null); const toast = useToast();
  return <div className="grid gap-5"><header><h2 className="text-2xl font-bold text-unison-blue">Moderación de productos</h2><p className="text-slate-600 mt-2">Revisa las publicaciones y las correcciones enviadas por emprendedores.</p></header>
    <div className="grid gap-3 sm:grid-cols-2"><label className="field-label sm:col-span-2">Buscar producto o negocio<input type="search" className="w-full mt-2" maxLength={120} value={listing.filters.q} onChange={event => listing.changeFilters({ q: event.target.value })} /></label><label className="field-label">Estado<select className="w-full mt-2" value={listing.filters.estado} onChange={event => listing.changeFilters({ estado: event.target.value })}><option value="">Todos</option>{Object.entries(states).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-label">ID de negocio (opcional)<input type="number" className="w-full mt-2" min="1" step="1" value={listing.filters.business_id} onChange={event => listing.changeFilters({ business_id: event.target.value })} /></label></div>
    <ErrorAlert error={listing.error} onRetry={listing.refetch} />
    {listing.loading || listing.data === null && !listing.error ? <Spinner label="Cargando productos…" /> : !listing.error && <>
      <p className="text-sm text-slate-600" role="status">{listing.meta?.total ?? 0} productos encontrados</p>
      {listing.data?.length ? <div className="grid gap-4 md:grid-cols-2">{listing.data.map(product => <article key={product.id} className="surface overflow-hidden flex flex-col">
        {product.imagen_url && <img src={product.imagen_url} alt={product.nombre} loading="lazy" className="w-full h-44 object-cover" />}
        <div className="p-5 grid gap-3 grow"><h3 className="font-bold text-xl text-unison-blue break-words">{product.nombre}</h3><p className="text-sm break-words">{product.nombre_negocio} · Negocio #{product.business_id}</p><strong>{formatCurrency(product.precio)}</strong><p className="text-slate-600 whitespace-pre-wrap break-words">{product.descripcion}</p><p className="text-sm font-semibold">{states[product.estado]}</p>
          {product.motivo_moderacion && <p className="rounded-lg bg-red-50 text-red-800 p-3 whitespace-pre-wrap break-words">Motivo: {product.motivo_moderacion}</p>}
          {product.moderado_at && <p className="text-sm text-slate-600">Moderado: {formatDate(product.moderado_at)}</p>}
          {product.estado === 'oculto_admin' && product.editado_tras_moderacion && <p className="rounded-lg bg-green-100 text-green-800 p-3 font-semibold">Corregido por el emprendedor después de la moderación. Pendiente de revisión.</p>}
          <button className={`button justify-self-start mt-auto ${product.estado === 'oculto_admin' ? 'button-primary' : 'button-danger'}`} type="button" onClick={() => setSelected(product)}>{product.estado === 'oculto_admin' ? 'Restaurar producto' : 'Ocultar producto'}</button>
        </div>
      </article>)}</div> : <EmptyState title="Sin productos para revisar" description="Prueba otros filtros o una búsqueda diferente." />}
      <Pagination page={listing.page} totalPages={listing.meta?.total_pages} onPageChange={listing.setPage} disabled={listing.loading} />
    </>}
    {selected && <ModerationDialog key={selected.id} product={selected} onClose={() => setSelected(null)} onDone={async () => { await listing.refetch(); toast.success(selected.estado === 'oculto_admin' ? 'Producto restaurado.' : 'Producto ocultado.'); }} />}
  </div>;
}

function ModerationDialog({ product, onDone, onClose }) {
  const hide = product.estado !== 'oculto_admin';
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);
  const confirm = async () => {
    if (hide && (reason.trim().length < 5 || reason.trim().length > 500)) throw new Error('Escribe un motivo de 5 a 500 caracteres.');
    setBusy(true);
    try { await api.patch(`/admin/products/${product.id}/moderate`, { ocultar: hide, ...(hide ? { motivo_moderacion: reason.trim() } : {}) }); await onDone(); }
    finally { setBusy(false); }
  };
  return <ConfirmDialog open title={hide ? 'Ocultar producto' : 'Restaurar producto'} description={hide ? `«${product.nombre}» dejará de ser público. El emprendedor recibirá el motivo.` : `«${product.nombre}» volverá al estado activo y se notificará al emprendedor.`} confirmLabel={hide ? 'Confirmar ocultamiento' : 'Confirmar restauración'} destructive={hide} onConfirm={confirm} onClose={onClose}>{hide && <label className="field-label mt-5">Motivo obligatorio<textarea className="w-full mt-2" rows={4} minLength={5} maxLength={500} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>}</ConfirmDialog>;
}
