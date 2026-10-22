import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../utils/format.js';
import { useAdminListing } from './AdminDashboardPage.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import Pagination from '../../components/common/Pagination.jsx';

const statuses = { pendiente: 'Pendientes', aprobada: 'Aprobadas', rechazada: 'Rechazadas', suspendida: 'Suspendidas' };

export default function PendingRequestsPage() {
  const [search] = useSearchParams();
  const listing = useAdminListing('/admin/requests', { status: Object.hasOwn(statuses, search.get('status')) ? search.get('status') : 'pendiente', q: '' });
  const [credential, setCredential] = useState(null); const [action, setAction] = useState(null);
  const toast = useToast();
  return <div className="grid gap-5">
    <header><h2 className="text-2xl font-bold text-unison-blue">Solicitudes y cuentas</h2><p className="text-slate-600 mt-2">Verifica la pertenencia a UNISON antes de aprobar una solicitud.</p></header>
    <div className="flex flex-wrap gap-2" aria-label="Estado de las cuentas">{Object.entries(statuses).map(([value, label]) => <button type="button" key={value} className={`button ${listing.filters.status === value ? 'button-primary' : 'button-secondary'}`} aria-pressed={listing.filters.status === value} onClick={() => listing.changeFilters({ status: value })}>{label}</button>)}</div>
    <label className="field-label">Buscar solicitante o negocio<input type="search" className="w-full mt-2" maxLength={120} value={listing.filters.q} onChange={event => listing.changeFilters({ q: event.target.value })} /></label>
    <ErrorAlert error={listing.error} onRetry={listing.refetch} />
    {listing.loading || listing.data === null && !listing.error ? <Spinner label="Cargando solicitudes…" /> : !listing.error && <>
      <p className="text-sm text-slate-600" role="status">{listing.meta?.total ?? 0} cuentas encontradas</p>
      {listing.data?.length ? <div className="grid gap-4">{listing.data.map(user => <article key={user.id} className="surface p-5 grid gap-3">
        <h3 className="font-bold text-xl text-unison-blue break-words">{user.nombre_completo}</h3><p className="break-words">{user.nombre_negocio} · {user.category_nombre}</p>
        <dl className="grid gap-2 text-sm"><div><dt className="text-slate-600">Correo institucional</dt><dd className="break-all">{user.email_institucional}</dd></div><div><dt className="text-slate-600">Matrícula</dt><dd>{user.matricula_unison}</dd></div><div><dt className="text-slate-600">Solicitud</dt><dd>{formatDate(user.created_at)}</dd></div>{user.fecha_resolucion && <div><dt className="text-slate-600">Resolución</dt><dd>{formatDate(user.fecha_resolucion)}</dd></div>}</dl>
        {user.motivo_estado && <p className="rounded-lg bg-unison-gold-soft text-unison-blue p-3 whitespace-pre-wrap break-words">Motivo: {user.motivo_estado}</p>}
        {user.suspendida_hasta && <p className="text-sm">Suspensión hasta: {formatDate(user.suspendida_hasta)}</p>}
        <div className="flex flex-wrap gap-2"><button type="button" className="button button-secondary" onClick={() => setCredential(user)}>Ver credencial privada</button>
          {user.estado_cuenta === 'pendiente' && <><button type="button" className="button button-primary" onClick={() => setAction({ kind: 'approve', user })}>Aprobar</button><button type="button" className="button button-danger" onClick={() => setAction({ kind: 'reject', user })}>Rechazar</button></>}
          {user.estado_cuenta === 'aprobada' && <button type="button" className="button button-danger" onClick={() => setAction({ kind: 'suspend', user })}>Suspender cuenta</button>}
          {user.estado_cuenta === 'suspendida' && <button type="button" className="button button-primary" onClick={() => setAction({ kind: 'reactivate', user })}>Reactivar cuenta</button>}
        </div>
      </article>)}</div> : <EmptyState title="No hay solicitudes para mostrar" description="Selecciona otro estado o cambia la búsqueda." />}
      <Pagination page={listing.page} totalPages={listing.meta?.total_pages} onPageChange={listing.setPage} disabled={listing.loading} />
    </>}
    {credential && <CredentialViewer key={credential.id} user={credential} onClose={() => setCredential(null)} />}
    {action && <RequestActionDialog key={`${action.user.id}-${action.kind}`} action={action} onClose={() => setAction(null)} onDone={async () => { await listing.refetch(); toast.success('El estado de la cuenta fue actualizado.'); }} />}
  </div>;
}

function CredentialViewer({ user, onClose }) {
  const { token } = useAuth(); const dialog = useRef(null);
  const [url, setUrl] = useState(null); const [error, setError] = useState(null); const [loading, setLoading] = useState(true); const [attempt, setAttempt] = useState(0);
  useEffect(() => { const node = dialog.current; node.showModal(); return () => node.close(); }, []);
  useEffect(() => {
    const controller = new AbortController(); let objectUrl;
    setLoading(true); setError(null); setUrl(null);
    // api.blob usa fetch con Bearer JWT y devuelve response.blob(); no hay URL pública.
    api.blob(`/admin/requests/${user.id}/credential`, { signal: controller.signal }).then(blob => {
      if (controller.signal.aborted) return;
      if (!blob.type.startsWith('image/')) throw new Error('El servidor no devolvió una imagen de credencial válida.');
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(failure => { if (!controller.signal.aborted) setError(failure); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [user.id, token, attempt]);
  return createPortal(<dialog ref={dialog} className="confirm-dialog" aria-labelledby="credential-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === dialog.current) onClose(); }}><div className="dialog-content grid gap-4"><h2 id="credential-title">Credencial de {user.nombre_completo}</h2><p className="text-sm text-slate-600">Documento privado para revisión administrativa.</p>{loading && <Spinner label="Cargando credencial privada…" />}<ErrorAlert error={error} onRetry={() => setAttempt(value => value + 1)} />{url && <img src={url} alt={`Credencial UNISON de ${user.nombre_completo}`} className="w-full max-h-[65dvh] object-contain" />}<button type="button" className="button button-secondary" onClick={onClose} autoFocus>Cerrar credencial</button></div></dialog>, document.body);
}

function RequestActionDialog({ action: { kind, user }, onDone, onClose }) {
  const [reason, setReason] = useState(''); const [until, setUntil] = useState(''); const [busy, setBusy] = useState(false);
  const titles = { approve: 'Aprobar solicitud', reject: 'Rechazar solicitud', suspend: 'Suspender cuenta', reactivate: 'Reactivar cuenta' };
  const needsReason = kind === 'reject' || kind === 'suspend';
  const confirm = async () => {
    if (needsReason && (reason.trim().length < 5 || reason.trim().length > 500)) throw new Error('Escribe un motivo de 5 a 500 caracteres.');
    setBusy(true);
    try {
      if (kind === 'approve' || kind === 'reject') await api.patch(`/admin/requests/${user.id}`, { decision: kind === 'approve' ? 'aprobada' : 'rechazada', ...(needsReason ? { motivo: reason.trim() } : {}) });
      else await api.patch(`/admin/users/${user.id}/suspend`, { suspend: kind === 'suspend', ...(needsReason ? { motivo: reason.trim() } : {}), ...(kind === 'suspend' && until ? { hasta: until } : {}) });
      await onDone();
    } finally { setBusy(false); }
  };
  return <ConfirmDialog open title={titles[kind]} description={`${user.nombre_completo} · ${user.nombre_negocio}.${kind === 'suspend' ? ' Se cerrará el negocio y se revocarán sus sesiones.' : ' El solicitante recibirá una notificación.'}`} confirmLabel={titles[kind]} destructive={needsReason} onConfirm={confirm} onClose={onClose}><fieldset disabled={busy} className="grid gap-4 mt-4">{needsReason && <label className="field-label">Motivo obligatorio<textarea className="w-full mt-2" rows={4} minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>}{kind === 'suspend' && <label className="field-label">Fecha de reactivación (UTC, opcional)<input type="date" className="w-full mt-2" value={until} onChange={event => setUntil(event.target.value)} /><span className="field-hint block">Sin fecha, la suspensión permanece hasta una reactivación manual.</span></label>}</fieldset></ConfirmDialog>;
}
