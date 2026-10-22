import { useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../utils/format.js';
import { useAdminListing } from './AdminDashboardPage.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import Pagination from '../../components/common/Pagination.jsx';

const states = { pendiente: 'Pendiente', en_revision: 'En revisión', resuelto_con_sancion: 'Resuelto con sanción', desestimado: 'Desestimado' };
const reasons = { informacion_falsa: 'Información falsa', contenido_inapropiado: 'Contenido inapropiado', producto_prohibido: 'Producto prohibido', suplantacion: 'Suplantación', otro: 'Otro' };
const actions = { ninguna: 'Sin sanción', ocultar_producto: 'Ocultar producto', suspender_cuenta: 'Suspender cuenta' };

export default function ReportsManagerPage() {
  const listing = useAdminListing('/admin/reports', { estado: '', business_id: '' });
  const [selected, setSelected] = useState(null); const toast = useToast();
  return <div className="grid gap-5">
    <header><h2 className="text-2xl font-bold text-unison-blue">Reportes de usuarios</h2><p className="text-slate-600 mt-2">Revisa la información y aplica una resolución junto con la sanción correspondiente.</p></header>
    <div className="grid gap-3 sm:grid-cols-2"><label className="field-label">Estado<select className="w-full mt-2" value={listing.filters.estado} onChange={event => listing.changeFilters({ estado: event.target.value })}><option value="">Todos</option>{Object.entries(states).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-label">ID de negocio (opcional)<input type="number" min="1" step="1" className="w-full mt-2" value={listing.filters.business_id} onChange={event => listing.changeFilters({ business_id: event.target.value })} /></label></div>
    <ErrorAlert error={listing.error} onRetry={listing.refetch} />
    {listing.loading || listing.data === null && !listing.error ? <Spinner label="Cargando reportes…" /> : !listing.error && <>
      <p className="text-sm text-slate-600" role="status">{listing.meta?.total ?? 0} reportes encontrados</p>
      {listing.data?.length ? <div className="grid gap-4">{listing.data.map(report => <article key={report.id} className="surface p-5 grid gap-3">
        <div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold text-xl text-unison-blue break-words">{report.nombre_negocio}</h3><span className="rounded-full bg-slate-100 text-slate-700 px-3 py-2 text-sm">{states[report.estado_reporte]}</span></div>
        <p className="font-semibold">Reporte #{report.id} · {reasons[report.motivo]}</p><p className="text-sm text-slate-600">Negocio #{report.business_id} · {report.reportes_del_negocio} reportes históricos</p>
        {report.product_id && <p className="text-sm">Producto: {report.producto_nombre || `#${report.product_id}`}</p>}
        <p className="whitespace-pre-wrap break-words">{report.descripcion || 'Sin descripción adicional.'}</p><p className="text-sm text-slate-600">Recibido: {formatDate(report.created_at)}</p>
        {report.notas_admin && <p className="rounded-lg bg-slate-50 p-3 whitespace-pre-wrap break-words">Notas administrativas: {report.notas_admin}</p>}
        {report.accion_tomada && <p className="text-sm">Acción registrada: {actions[report.accion_tomada]}{report.resolved_at ? ` · ${formatDate(report.resolved_at)}` : ''}</p>}
        <button type="button" className="button button-primary justify-self-start" onClick={() => setSelected(report)}>Revisar reporte</button>
      </article>)}</div> : <EmptyState title="Sin reportes para mostrar" description="No hay reportes que coincidan con los filtros seleccionados." />}
      <Pagination page={listing.page} totalPages={listing.meta?.total_pages} onPageChange={listing.setPage} disabled={listing.loading} />
    </>}
    {selected && <ResolutionDialog key={selected.id} report={selected} onClose={() => setSelected(null)} onDone={async result => { await listing.refetch(); toast.success(`Reporte actualizado: ${states[result.estado_reporte]}.`); }} />}
  </div>;
}

function ResolutionDialog({ report, onDone, onClose }) {
  const [action, setAction] = useState('ninguna');
  const [status, setStatus] = useState(report.estado_reporte === 'en_revision' ? 'en_revision' : 'desestimado');
  const [reason, setReason] = useState(''); const [notes, setNotes] = useState(report.notas_admin ?? ''); const [busy, setBusy] = useState(false);
  const confirm = async () => {
    if (action !== 'ninguna' && (reason.trim().length < 5 || reason.trim().length > 500)) throw new Error('Escribe un motivo de sanción de 5 a 500 caracteres.');
    if (action === 'ocultar_producto' && !report.product_id) throw new Error('Este reporte no tiene un producto asociado.');
    setBusy(true);
    try {
      // Una única petición ejecuta la resolución y la sanción en la misma transacción.
      const response = await api.patch(`/admin/reports/${report.id}`, { estado_reporte: action === 'ninguna' ? status : 'resuelto_con_sancion', notas_admin: notes.trim(), accion_automatica: action, ...(action !== 'ninguna' ? { motivo_sancion: reason.trim() } : {}) });
      await onDone(response.data);
    } finally { setBusy(false); }
  };
  const warning = action === 'suspender_cuenta' ? 'La cuenta será suspendida, el negocio se cerrará y sus sesiones serán revocadas.' : action === 'ocultar_producto' ? 'El producto dejará de ser público y el emprendedor recibirá una notificación.' : 'Se guardará el estado seleccionado sin aplicar una nueva sanción.';
  return <ConfirmDialog open title={`Resolver reporte #${report.id}`} description={warning} destructive={action !== 'ninguna'} confirmLabel={action === 'ninguna' ? 'Guardar resolución' : 'Confirmar resolución y sanción'} onConfirm={confirm} onClose={onClose}>
    <fieldset disabled={busy} className="grid gap-4 mt-5"><p className="font-semibold break-words">{report.nombre_negocio}</p><label className="field-label">Decisión<select className="w-full mt-2" value={action} onChange={event => setAction(event.target.value)}><option value="ninguna">Sin sanción</option><option value="ocultar_producto" disabled={!report.product_id}>Ocultar producto</option><option value="suspender_cuenta" disabled={!['aprobada', 'suspendida'].includes(report.estado_cuenta)}>Suspender cuenta</option></select></label>
      {action === 'ninguna' ? <label className="field-label">Estado del reporte<select className="w-full mt-2" value={status} onChange={event => setStatus(event.target.value)}><option value="en_revision">En revisión</option><option value="desestimado">Desestimado</option></select></label> : <label className="field-label">Motivo de sanción obligatorio<textarea className="w-full mt-2" rows={3} minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>}
      <label className="field-label">Notas administrativas<textarea className="w-full mt-2" rows={4} maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} /></label><p className="field-hint">{notes.length}/1000 caracteres</p>
    </fieldset>
  </ConfirmDialog>;
}
