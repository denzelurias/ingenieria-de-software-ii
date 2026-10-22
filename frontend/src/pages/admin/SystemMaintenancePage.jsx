import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../utils/format.js';
import { useAdminListing } from './AdminDashboardPage.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import Pagination from '../../components/common/Pagination.jsx';

const backupPattern = /^emprendebuho_\d{8}_\d{6}\.sqlite$/;
const operations = {
  inactivity: { path: '/admin/maintenance/run-inactivity-check', title: 'Ejecutar barrido de inactividad', description: 'Ocultará negocios que superen el límite de inactividad y reactivará cuentas cuyas suspensiones temporales hayan vencido.' },
  cleanup: { path: '/admin/maintenance/cleanup-orphans', title: 'Limpiar archivos huérfanos', description: 'Eliminará de las imágenes públicas los archivos sin referencias con más de una hora de antigüedad. Esta eliminación no se puede deshacer.' },
  backup: { path: '/admin/maintenance/backup', title: 'Crear respaldo SQLite', description: 'Creará un respaldo de la base de datos. El servidor puede retirar respaldos antiguos de acuerdo con su configuración de conservación.' }
};
const entities = { user: 'Cuenta', business: 'Negocio', product: 'Producto', report: 'Reporte', category: 'Categoría', system: 'Sistema' };
const formatSize = bytes => `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(Number(bytes) / 1024)} KB`;

export default function SystemMaintenancePage() {
  const health = useApi(({ signal }) => api.get('/admin/maintenance/health', { signal }));
  const audit = useAdminListing('/admin/audit-logs', { accion: '', entidad_tipo: '' });
  const [operation, setOperation] = useState(null); const [result, setResult] = useState(null);
  const [downloadBusy, setDownloadBusy] = useState(false); const [downloadError, setDownloadError] = useState(null);
  const downloadController = useRef(null); const downloads = useRef(new Map()); const toast = useToast();
  useEffect(() => {
    const urls = downloads.current;
    return () => { downloadController.current?.abort(); for (const [url, timer] of urls) { clearTimeout(timer); URL.revokeObjectURL(url); } urls.clear(); };
  }, []);
  const execute = async () => {
    const response = await api.post(operations[operation].path);
    setResult({ kind: operation, data: response.data });
    await Promise.all([health.refetch(), audit.refetch()]); toast.success('Operación de mantenimiento completada.');
  };
  const download = async filename => {
    if (downloadController.current) return;
    if (!backupPattern.test(filename)) { setDownloadError(new Error('El nombre del respaldo no es válido.')); return; }
    const controller = new AbortController(); downloadController.current = controller;
    setDownloadBusy(true); setDownloadError(null);
    try {
      const blob = await api.blob(`/admin/maintenance/backups/${encodeURIComponent(filename)}`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
      const timer = setTimeout(() => { URL.revokeObjectURL(url); downloads.current.delete(url); }, 1000);
      downloads.current.set(url, timer);
    } catch (failure) { if (!controller.signal.aborted) setDownloadError(failure); }
    finally { if (downloadController.current === controller) downloadController.current = null; if (!controller.signal.aborted) setDownloadBusy(false); }
  };
  return <div className="grid gap-6">
    <header><h2 className="text-2xl font-bold text-unison-blue">Mantenimiento y auditoría</h2><p className="text-slate-600 mt-2">Consulta el estado del sistema. Las operaciones se ejecutan únicamente después de tu confirmación.</p></header>
    <section className="surface p-5 grid gap-4" aria-label="Estado del sistema"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold text-unison-blue">Estado de la base de datos</h3><button type="button" className="button button-secondary" onClick={health.refetch} disabled={health.loading}>Actualizar estado</button></div><ErrorAlert error={health.error} onRetry={health.refetch} />
      {health.loading ? <Spinner label="Consultando estado…" /> : !health.error && health.data && <>
        <dl className="grid gap-4 sm:grid-cols-3">{[['Tamaño de SQLite', formatSize(health.data.size_bytes)], ['Candidatos por inactividad', health.data.candidatos_inactividad], ['Imágenes públicas guardadas', health.data.archivos_uploads]].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="text-xl font-semibold text-unison-blue">{value}</dd></div>)}</dl>
        <details><summary className="min-h-11 flex items-center cursor-pointer font-semibold text-unison-blue">Conteo de registros por tabla</summary><dl className="grid gap-2 sm:grid-cols-2 mt-3">{Object.entries(health.data.filas_por_tabla).map(([table, count]) => <div key={table} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm"><dt className="break-all">{table}</dt><dd>{count}</dd></div>)}</dl></details>
      </>}
    </section>
    <section className="surface p-5 grid gap-4"><h3 className="text-xl font-bold text-unison-blue">Operaciones manuales</h3><div className="flex flex-wrap gap-3">{Object.entries(operations).map(([key, item]) => <button key={key} type="button" className={`button ${key === 'cleanup' ? 'button-danger' : 'button-secondary'}`} onClick={() => setOperation(key)}>{item.title}</button>)}</div>
      {result && <div role="status" className="rounded-xl bg-unison-gold-soft text-unison-blue p-4"><strong>{operations[result.kind].title}: completado</strong><p className="mt-2 text-sm break-words">{result.kind === 'inactivity' ? `Negocios ocultados: ${result.data.ocultados}. Cuentas reactivadas: ${result.data.reactivados}.` : result.kind === 'cleanup' ? `Archivos eliminados: ${result.data.eliminados}.` : `Respaldo creado: ${result.data.filename} (${formatSize(result.data.size_bytes)}).`}</p></div>}
    </section>
    <section className="surface p-5 grid gap-4"><h3 className="text-xl font-bold text-unison-blue">Respaldos disponibles</h3><p className="text-sm text-slate-600">Los respaldos contienen información privada. Guárdalos en una ubicación protegida.</p><ErrorAlert error={downloadError} />{downloadBusy && <Spinner label="Preparando descarga autenticada…" />}
      {health.loading ? <Spinner label="Cargando respaldos…" /> : !health.error && (health.data?.backups.length ? <ul className="grid gap-3">{health.data.backups.map(backup => <li key={backup.filename} className="rounded-xl border border-slate-200 p-4 grid gap-3"><strong className="text-sm break-all">{backup.filename}</strong><p className="text-sm text-slate-600">{formatSize(backup.size_bytes)} · {formatDate(backup.created_at)}</p><button type="button" className="button button-secondary justify-self-start" disabled={downloadBusy} onClick={() => download(backup.filename)}>Descargar .sqlite</button></li>)}</ul> : <p className="text-slate-600">Todavía no hay respaldos. Usa «Crear respaldo SQLite» para generar uno.</p>)}
    </section>
    <section className="grid gap-4" aria-label="Auditoría"><h3 className="text-xl font-bold text-unison-blue">Registro de auditoría</h3><div className="grid gap-3 sm:grid-cols-2"><label className="field-label">Acción exacta (opcional)<input className="w-full mt-2" maxLength={100} placeholder="Por ejemplo: resolver_reporte" value={audit.filters.accion} onChange={event => audit.changeFilters({ accion: event.target.value })} /></label><label className="field-label">Tipo de entidad<select className="w-full mt-2" value={audit.filters.entidad_tipo} onChange={event => audit.changeFilters({ entidad_tipo: event.target.value })}><option value="">Todas</option>{Object.entries(entities).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><button type="button" className="button button-secondary justify-self-start" disabled={audit.loading} onClick={audit.refetch}>Actualizar auditoría</button><ErrorAlert error={audit.error} onRetry={audit.refetch} />
      {audit.loading || audit.data === null && !audit.error ? <Spinner label="Cargando auditoría…" /> : !audit.error && <>
        {audit.data?.length ? <ul className="grid gap-3">{audit.data.map(item => <li key={item.id} className="surface p-4 grid gap-2"><strong className="text-unison-blue break-words">#{item.id} · {item.accion.replaceAll('_', ' ')}</strong><p className="text-sm text-slate-600">{formatDate(item.created_at, { dateStyle: 'short', timeStyle: 'short' })} · {item.actor_id == null ? 'Sistema' : `Usuario #${item.actor_id}`} · {entities[item.entidad_tipo] || item.entidad_tipo}{item.entidad_id != null ? ` #${item.entidad_id}` : ''}</p>{item.detalles && <details><summary className="text-button cursor-pointer">Ver detalles</summary><pre className="whitespace-pre-wrap break-all text-xs bg-slate-50 rounded-lg p-3 max-h-64 overflow-y-auto">{JSON.stringify(item.detalles, null, 2)}</pre></details>}</li>)}</ul> : <EmptyState title="Sin registros de auditoría" description="No hay acciones que coincidan con los filtros seleccionados." />}
        <Pagination page={audit.page} totalPages={audit.meta?.total_pages} onPageChange={audit.setPage} disabled={audit.loading} />
      </>}
    </section>
    {operation && <ConfirmDialog open title={operations[operation].title} description={operations[operation].description} confirmLabel="Confirmar ejecución" destructive={operation !== 'backup'} onConfirm={execute} onClose={() => setOperation(null)} />}
  </div>;
}
