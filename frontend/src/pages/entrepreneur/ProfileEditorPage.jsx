import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ImageUploader from '../../components/common/ImageUploader.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import Spinner from '../../components/common/Spinner.jsx';

const contactTypes = [['whatsapp', 'WhatsApp'], ['telefono', 'Teléfono'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['facebook', 'Facebook'], ['otro', 'Sitio web']];
const contactDraft = contact => ({ ...contact, key: crypto.randomUUID() });

export default function ProfileEditorPage() {
  const context = useOutletContext();
  if (!context.business) return <Spinner label="Cargando perfil…" />;
  return <ProfileEditor key={context.business.id} {...context} />;
}

function ProfileEditor({ business, refreshBusiness }) {
  const auth = useAuth(); const toast = useToast();
  const catalogs = useApi(({ signal }) => api.get('/catalogs', { signal, auth: false }));
  const [profile, setProfile] = useState({ nombre_negocio: business.nombre_negocio, category_id: String(business.category_id), descripcion: business.descripcion });
  const [contacts, setContacts] = useState(() => business.contacts.map(contactDraft));
  const [photos, setPhotos] = useState({ perfil: null, menu: null });
  const [removing, setRemoving] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  const synchronize = async response => { auth.setBusiness(response.data); await refreshBusiness(); };
  const perform = async (operation, message) => {
    if (busy) return;
    setBusy(true); setError(null);
    try { await operation(); toast.success(message); }
    catch (failure) { setError(failure); }
    finally { setBusy(false); }
  };
  const saveProfile = event => {
    event.preventDefault();
    void perform(async () => {
      if (profile.nombre_negocio.trim().length < 2) throw new Error('El nombre del negocio debe tener al menos 2 caracteres.');
      const response = await api.put('/my-business/profile', { ...profile, nombre_negocio: profile.nombre_negocio.trim(), category_id: Number(profile.category_id), descripcion: profile.descripcion.trim() });
      setProfile({ nombre_negocio: response.data.nombre_negocio, category_id: String(response.data.category_id), descripcion: response.data.descripcion });
      await synchronize(response);
    }, 'Perfil actualizado.');
  };
  const savePhotos = event => {
    event.preventDefault();
    void perform(async () => {
      if (!photos.perfil && !photos.menu) throw new Error('Elige una foto de perfil o menú antes de guardar.');
      const body = new FormData();
      if (photos.perfil) body.append('foto_perfil', photos.perfil);
      if (photos.menu) body.append('foto_menu', photos.menu);
      const response = await api.put('/my-business/photos', body);
      setPhotos({ perfil: null, menu: null }); await synchronize(response);
    }, 'Imágenes actualizadas.');
  };
  const removePhoto = async () => {
    const response = await api.delete(`/my-business/photos/${removing}`);
    setPhotos(previous => ({ ...previous, [removing]: null }));
    await synchronize(response); toast.success('Imagen eliminada.');
  };
  const changeContact = (key, patch) => setContacts(previous => previous.map(item => item.key === key ? { ...item, ...patch } : item));
  const moveContact = (index, direction) => setContacts(previous => { const next = [...previous]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; });
  const saveContacts = event => {
    event.preventDefault();
    void perform(async () => {
      if (contacts.some(item => !item.valor.trim())) throw new Error('Completa el valor de cada contacto o elimina el que no uses.');
      const response = await api.put('/my-business/contacts', { contacts: contacts.map(({ tipo_contacto, valor, etiqueta, es_principal }) => ({ tipo_contacto, valor: valor.trim(), etiqueta: etiqueta?.trim() || '', es_principal })) });
      setContacts(response.data.contacts.map(contactDraft)); await synchronize(response);
    }, 'Medios de contacto actualizados.');
  };
  return <div className="grid gap-6">
    <header><h2 className="text-2xl font-bold text-unison-blue">Editar perfil</h2><p className="mt-2 text-slate-600">Presenta tu negocio y elige cómo puede contactarte la comunidad.</p></header>
    <ErrorAlert error={error} />
    <form onSubmit={saveProfile} className="surface p-5"><fieldset disabled={busy} className="grid gap-4"><legend className="text-xl font-bold text-unison-blue mb-4">Datos del negocio</legend>
      <label className="field-label">Nombre del negocio<input name="nombre_negocio" className="w-full mt-2" required minLength={2} maxLength={80} value={profile.nombre_negocio} onChange={event => setProfile(previous => ({ ...previous, nombre_negocio: event.target.value }))} /></label>
      <label className="field-label">Categoría<select name="category_id" className="w-full mt-2" required value={profile.category_id} onChange={event => setProfile(previous => ({ ...previous, category_id: event.target.value }))}>
        {!catalogs.data?.categories.some(category => category.id === business.category_id) && <option value={business.category_id}>{business.category_nombre} (categoría actual)</option>}
        {catalogs.data?.categories.map(category => <option key={category.id} value={category.id}>{category.nombre}</option>)}
      </select></label><ErrorAlert error={catalogs.error} onRetry={catalogs.refetch} />
      <label className="field-label">Descripción<textarea name="descripcion" className="w-full mt-2" rows={5} maxLength={1000} value={profile.descripcion} onChange={event => setProfile(previous => ({ ...previous, descripcion: event.target.value }))} /></label><p className="field-hint">{profile.descripcion.length}/1000 caracteres</p>
      <button className="button button-primary justify-self-start" type="submit">Guardar perfil</button>
    </fieldset></form>
    <form onSubmit={savePhotos} className="surface p-5"><fieldset disabled={busy} className="grid gap-5"><legend className="text-xl font-bold text-unison-blue mb-4">Imágenes del negocio</legend>
      <div className="grid md:grid-cols-2 gap-6">{[['perfil', 'Foto de perfil', business.foto_perfil_url], ['menu', 'Foto del menú', business.foto_menu_url]].map(([tipo, label, imageUrl]) => <ImageUploader key={tipo} label={label} name={`foto_${tipo}`} value={photos[tipo]} imageUrl={imageUrl} disabled={busy} onChange={file => setPhotos(previous => ({ ...previous, [tipo]: file }))} onRemove={() => { if (!photos[tipo] && imageUrl) setRemoving(tipo); }} />)}</div>
      <button type="submit" className="button button-primary justify-self-start" disabled={!photos.perfil && !photos.menu}>Guardar imágenes</button>
    </fieldset></form>
    <form onSubmit={saveContacts} className="surface p-5"><fieldset disabled={busy} className="grid gap-4"><legend className="text-xl font-bold text-unison-blue mb-4">Medios de contacto</legend><p className="text-sm text-slate-600">Hasta 10 contactos. Marca uno como principal; si no eliges ninguno, se usará el primero. Se mostrarán en este orden, con el principal al inicio.</p>
      {contacts.map((contact, index) => <fieldset key={contact.key} className="border border-slate-200 rounded-xl p-4 grid gap-3 min-w-0"><legend className="text-sm font-semibold px-1">Contacto {index + 1}</legend>
        <label className="field-label">Tipo<select className="w-full mt-2" value={contact.tipo_contacto} onChange={event => changeContact(contact.key, { tipo_contacto: event.target.value })}>{contactTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="field-label">{['telefono', 'whatsapp'].includes(contact.tipo_contacto) ? 'Teléfono (10 dígitos; se acepta +52)' : ['instagram', 'tiktok'].includes(contact.tipo_contacto) ? 'Usuario o URL del perfil' : 'URL completa (http o https)'}<input className="w-full mt-2" required maxLength={200} value={contact.valor} onChange={event => changeContact(contact.key, { valor: event.target.value })} /></label>
        <label className="field-label">Etiqueta (opcional)<input className="w-full mt-2" maxLength={40} value={contact.etiqueta ?? ''} onChange={event => changeContact(contact.key, { etiqueta: event.target.value })} /></label>
        <label className="flex items-center gap-3 min-h-11 text-sm"><input type="radio" name="contacto_principal" className="w-5 h-5" checked={contact.es_principal} onChange={() => setContacts(previous => previous.map(item => ({ ...item, es_principal: item.key === contact.key })))} />Contacto principal</label>
        <div className="flex flex-wrap gap-2"><button className="button button-secondary" type="button" disabled={index === 0} onClick={() => moveContact(index, -1)}>Subir</button><button className="button button-secondary" type="button" disabled={index === contacts.length - 1} onClick={() => moveContact(index, 1)}>Bajar</button><button className="button button-danger" type="button" onClick={() => setContacts(previous => previous.filter(item => item.key !== contact.key))}>Quitar contacto</button></div>
      </fieldset>)}
      <div className="flex flex-wrap gap-3"><button className="button button-secondary" type="button" disabled={contacts.length >= 10} onClick={() => setContacts(previous => [...previous, contactDraft({ tipo_contacto: 'whatsapp', valor: '', etiqueta: '', es_principal: previous.length === 0 })])}>Agregar contacto</button><button type="submit" className="button button-primary">Guardar contactos</button></div>
    </fieldset></form>
    <ConfirmDialog open={Boolean(removing)} title="Eliminar imagen" description={`¿Quieres quitar la foto ${removing === 'menu' ? 'del menú' : 'de perfil'} del negocio?`} destructive confirmLabel="Eliminar imagen" onConfirm={removePhoto} onClose={() => setRemoving(null)} />
  </div>;
}
