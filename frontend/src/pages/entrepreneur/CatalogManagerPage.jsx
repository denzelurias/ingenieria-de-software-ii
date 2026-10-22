import { useRef, useState } from 'react';
import { useOutletContext } from 'react-router';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency } from '../../utils/format.js';
import ProductFormModal from '../../components/product/ProductFormModal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Toggle from '../../components/common/Toggle.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import Spinner from '../../components/common/Spinner.jsx';

export default function CatalogManagerPage() {
  const { business, refreshBusiness } = useOutletContext();
  const toast = useToast(); const inFlight = useRef(false);
  const [editor, setEditor] = useState(null); const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('');
  if (!business) return <Spinner label="Cargando catálogo…" />;
  const normalize = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es-MX');
  const items = business.products.filter(item => (!status || item.estado === status) && normalize(`${item.nombre} ${item.descripcion}`).includes(normalize(query)));
  const save = async body => {
    if (editor.product) await api.put(`/my-business/products/${editor.product.id}`, body);
    else await api.post('/my-business/products', body);
    await refreshBusiness(); toast.success(editor.product ? 'Producto actualizado.' : 'Producto publicado.');
  };
  const toggle = async product => {
    if (inFlight.current || product.estado === 'oculto_admin') return;
    inFlight.current = true; setBusy(true); setError(null);
    try { await api.patch(`/my-business/products/${product.id}/status`, { estado: product.estado === 'activo' ? 'pausado' : 'activo' }); await refreshBusiness(); toast.success('Disponibilidad actualizada.'); }
    catch (failure) { setError(failure); } finally { inFlight.current = false; setBusy(false); }
  };
  const remove = async () => { await api.delete(`/my-business/products/${removing.id}`); await refreshBusiness(); toast.success('Producto eliminado del catálogo.'); };
  return <div className="grid gap-5">
    <header className="flex flex-wrap justify-between gap-4 items-center"><div><h2 className="text-2xl font-bold text-unison-blue">Mi catálogo</h2><p className="text-slate-600 mt-2">Publica y actualiza tus productos.</p></div><button type="button" className="button button-primary" onClick={() => setEditor({ product: null })}>Nuevo producto</button></header>
    <div className="grid sm:grid-cols-2 gap-3"><label className="field-label">Buscar producto<input type="search" className="w-full mt-2" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="field-label">Estado<select className="w-full mt-2" value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos</option><option value="activo">Activos</option><option value="pausado">Pausados</option><option value="oculto_admin">Ocultos por administración</option></select></label></div>
    <ErrorAlert error={error} />
    {items.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(product => <article key={product.id} className="surface overflow-hidden flex flex-col">
      {product.imagen_url && <img src={product.imagen_url} alt={product.nombre} loading="lazy" className="h-40 w-full object-cover" />}
      <div className="p-4 grid gap-3 grow"><h3 className="text-xl font-bold text-unison-blue break-words">{product.nombre}</h3><strong>{formatCurrency(product.precio)}</strong><p className="text-sm text-slate-600 whitespace-pre-wrap break-words">{product.descripcion}</p>
        {product.estado === 'oculto_admin' && <div className="error-alert m-0! block!"><strong>Oculto por administración</strong><p className="whitespace-pre-wrap break-words">Motivo: {product.motivo_moderacion || 'Consulta a administración.'}</p><p>Puedes editarlo para corregirlo. Solo administración puede volver a publicarlo.</p></div>}
        <Toggle label={product.estado === 'oculto_admin' ? 'Publicación bloqueada' : product.estado === 'activo' ? 'Disponible' : 'Pausado'} checked={product.estado === 'activo'} disabled={busy || product.estado === 'oculto_admin'} onChange={() => toggle(product)} />
        <div className="flex flex-wrap gap-2 mt-auto"><button type="button" className="button button-secondary" disabled={busy} onClick={() => setEditor({ product })}>Editar</button><button type="button" className="button button-danger" disabled={busy} onClick={() => setRemoving(product)}>Eliminar</button></div>
      </div></article>)}</div> : <EmptyState title={business.products.length ? 'Sin coincidencias' : 'Tu catálogo está listo para comenzar'} description="Publica un producto con foto, descripción y precio para mostrarlo a la comunidad." />}
    {editor && <ProductFormModal key={editor.product?.id ?? 'new'} open product={editor.product} onSave={save} onClose={() => setEditor(null)} />}
    <ConfirmDialog open={Boolean(removing)} title="Eliminar producto" description={`¿Quieres eliminar «${removing?.nombre ?? ''}» del catálogo? También se eliminará su imagen.`} confirmLabel="Eliminar producto" destructive onConfirm={remove} onClose={() => setRemoving(null)} />
  </div>;
}
