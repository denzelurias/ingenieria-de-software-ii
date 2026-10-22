import { useState } from 'react';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Toggle from '../../components/common/Toggle.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Spinner from '../../components/common/Spinner.jsx';

export default function CategoriesManagerPage() {
  const resource = useApi(({ signal }) => api.get('/admin/categories', { signal }));
  const [editor, setEditor] = useState(null); const [toggle, setToggle] = useState(null); const toast = useToast();
  const toggleCategory = async () => {
    await api.put(`/admin/categories/${toggle.id}`, { activa: !toggle.activa });
    await resource.refetch(); toast.success(toggle.activa ? 'Categoría desactivada.' : 'Categoría activada.');
  };
  return <div className="grid gap-5"><header className="flex flex-wrap justify-between gap-4 items-center"><div><h2 className="text-2xl font-bold text-unison-blue">Categorías</h2><p className="text-slate-600 mt-2">Administra las clasificaciones disponibles para los negocios.</p></div><button type="button" className="button button-primary" onClick={() => setEditor({ category: null })}>Crear categoría</button></header>
    <ErrorAlert error={resource.error} onRetry={resource.refetch} />
    {resource.loading ? <Spinner label="Cargando categorías…" /> : !resource.error && (resource.data?.length ? <div className="grid gap-4 sm:grid-cols-2">{resource.data.map(category => <article key={category.id} className="surface p-5 grid gap-3"><h3 className="font-bold text-xl text-unison-blue break-words">{category.nombre}</h3><p className="text-slate-600 whitespace-pre-wrap break-words">{category.descripcion || 'Sin descripción.'}</p><p className="text-sm">{category.negocios_count} negocios asociados · Icono: {category.icono}</p><Toggle label={category.activa ? 'Categoría activa' : 'Categoría inactiva'} checked={category.activa} onChange={() => setToggle(category)} /><button type="button" className="button button-secondary justify-self-start" onClick={() => setEditor({ category })}>Editar categoría</button></article>)}</div> : <EmptyState title="Todavía no hay categorías" description="Crea una categoría para clasificar los emprendimientos." />)}
    {editor && <CategoryDialog key={editor.category?.id ?? 'new'} category={editor.category} onClose={() => setEditor(null)} onDone={async () => { await resource.refetch(); toast.success('Categoría guardada.'); }} />}
    <ConfirmDialog open={Boolean(toggle)} title={toggle?.activa ? 'Desactivar categoría' : 'Activar categoría'} description={toggle?.activa ? `«${toggle.nombre}» dejará de ofrecerse a nuevos registros. Los negocios asociados conservarán su categoría.` : `«${toggle?.nombre ?? ''}» estará disponible para registros y ediciones.`} confirmLabel="Confirmar cambio" onConfirm={toggleCategory} onClose={() => setToggle(null)} />
  </div>;
}

function CategoryDialog({ category, onDone, onClose }) {
  const [name, setName] = useState(category?.nombre ?? ''); const [description, setDescription] = useState(category?.descripcion ?? '');
  const [icon, setIcon] = useState(category?.icono ?? 'Tags'); const [active, setActive] = useState(category?.activa ?? true); const [busy, setBusy] = useState(false);
  const save = async () => {
    if (name.trim().length < 2 || name.trim().length > 60) throw new Error('El nombre debe tener de 2 a 60 caracteres.');
    if (!/^[A-Za-z][A-Za-z0-9]{0,59}$/.test(icon)) throw new Error('Usa un nombre de icono de hasta 60 letras y números, comenzando con una letra.');
    setBusy(true);
    try {
      const body = { nombre: name.trim(), descripcion: description.trim(), icono: icon, activa: active };
      if (category) await api.put(`/admin/categories/${category.id}`, body); else await api.post('/admin/categories', body);
      await onDone();
    } finally { setBusy(false); }
  };
  return <ConfirmDialog open title={category ? 'Editar categoría' : 'Crear categoría'} description={!active ? 'La categoría quedará inactiva. Los negocios existentes conservarán su clasificación.' : 'Guarda los datos de la categoría.'} confirmLabel="Guardar categoría" onConfirm={save} onClose={onClose}><fieldset disabled={busy} className="grid gap-4 mt-5"><label className="field-label">Nombre<input className="w-full mt-2" name="nombre" required minLength={2} maxLength={60} value={name} onChange={event => setName(event.target.value)} /></label><label className="field-label">Descripción<textarea className="w-full mt-2" name="descripcion" maxLength={200} rows={3} value={description} onChange={event => setDescription(event.target.value)} /></label><p className="field-hint">{description.length}/200 caracteres</p><label className="field-label">Nombre del icono<input className="w-full mt-2" name="icono" maxLength={60} value={icon} onChange={event => setIcon(event.target.value)} /><span className="field-hint block">Por ejemplo: Tags, Utensils, Cake o Coffee.</span></label><Toggle checked={active} label="Categoría activa" onChange={setActive} disabled={busy} /></fieldset></ConfirmDialog>;
}
