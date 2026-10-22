import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { AuthFrame, FormField, validPassword, passwordHint } from './LoginPage.jsx';
import ImageUploader from '../../components/common/ImageUploader.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
export default function RegisterRequestPage() {
  const navigate = useNavigate(); const catalogs = useApi(({ signal }) => api.get('/catalogs', { signal, auth: false }));
  const [values, setValues] = useState({ nombre_completo: '', email_institucional: '', matricula_unison: '', password: '', confirmacion: '', nombre_negocio: '', category_id: '', descripcion: '' });
  const [credential, setCredential] = useState(null); const [touched, setTouched] = useState({}); const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  const errors = {
    nombre_completo: values.nombre_completo.trim().length < 3 ? 'Escribe tu nombre completo (mínimo 3 caracteres).' : null,
    email_institucional: !/^[^\s@]+@unison\.mx$/i.test(values.email_institucional.trim()) ? 'Usa tu correo institucional @unison.mx.' : null,
    matricula_unison: !/^\d{9}$/.test(values.matricula_unison) ? 'La matrícula debe tener exactamente 9 dígitos.' : null,
    password: !validPassword(values.password) ? passwordHint : null,
    confirmacion: values.password !== values.confirmacion ? 'Las contraseñas no coinciden.' : null,
    nombre_negocio: values.nombre_negocio.trim().length < 2 ? 'Escribe al menos 2 caracteres para tu negocio.' : null,
    category_id: !values.category_id ? 'Selecciona una categoría.' : null,
    credencial: !credential ? 'La foto de tu credencial UNISON es obligatoria.' : null
  };
  const field = (name, label, props = {}) => <FormField key={name} label={label} name={name} value={values[name]} onChange={event => { setValues(previous => ({ ...previous, [name]: event.target.value })); setTouched(previous => ({ ...previous, [name]: true })); }} error={touched[name] ? errors[name] : null} required {...props} />;
  const submit = async event => {
    event.preventDefault(); if (busy) return; setTouched(Object.fromEntries(Object.keys(errors).map(key => [key, true]))); setError(null);
    if (Object.values(errors).some(Boolean)) { setError(new Error('Revisa los campos indicados antes de enviar.')); return; }
    setBusy(true); const body = new FormData();
    for (const [key, value] of Object.entries(values)) if (key !== 'confirmacion') body.append(key, key === 'password' ? value : value.trim());
    body.set('email_institucional', values.email_institucional.trim().toLowerCase()); body.append('credencial', credential);
    try { const response = await api.post('/auth/register-request', body, { auth: false }); setCredential(null); setValues(previous => ({ ...previous, password: '', confirmacion: '' })); navigate('/estado-cuenta', { replace: true, state: { account: { estado_cuenta: response.data.estado_cuenta }, message: 'Tu solicitud fue enviada. Espera la revisión de administración.' } }); }
    catch (failure) { setError(failure); } finally { setBusy(false); }
  };
  return <AuthFrame title="Comparte lo que haces" description="Solicita tu cuenta de emprendedor UNISON. Tu negocio será público después de la aprobación."><form className="grid gap-4" onSubmit={submit}>{field('nombre_completo', 'Nombre completo', { minLength: 3, maxLength: 120, autoComplete: 'name' })}{field('email_institucional', 'Correo institucional @unison.mx', { type: 'email', maxLength: 254, autoComplete: 'email' })}{field('matricula_unison', 'Matrícula UNISON', { pattern: '[0-9]{9}', maxLength: 9, inputMode: 'numeric', autoComplete: 'off' })}{field('password', 'Contraseña', { type: 'password', minLength: 8, maxLength: 72, autoComplete: 'new-password' })}<p className="field-hint">{passwordHint}</p>{field('confirmacion', 'Confirmar contraseña', { type: 'password', maxLength: 72, autoComplete: 'new-password' })}<ImageUploader name="credencial" label="Foto de credencial UNISON" value={credential} onChange={value => { setCredential(value); setTouched(previous => ({ ...previous, credencial: true })); }} error={touched.credencial ? errors.credencial : null} disabled={busy} /><p className="field-hint">Tu credencial es privada y solo administración puede consultarla para verificar tu solicitud.</p>{field('nombre_negocio', 'Nombre del negocio', { minLength: 2, maxLength: 80 })}<label className="field-label">Categoría<select className="w-full mt-2" name="category_id" required value={values.category_id} onChange={event => setValues(previous => ({ ...previous, category_id: event.target.value }))}><option value="">{catalogs.loading ? 'Cargando categorías…' : 'Selecciona una categoría'}</option>{catalogs.data?.categories.map(category => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select>{touched.category_id && errors.category_id && <span className="field-error">{errors.category_id}</span>}</label><ErrorAlert error={catalogs.error} onRetry={catalogs.refetch} /><label className="field-label">Descripción (opcional)<textarea name="descripcion" className="w-full mt-2" rows={4} maxLength={1000} value={values.descripcion} onChange={event => setValues(previous => ({ ...previous, descripcion: event.target.value }))} /></label><p className="field-hint">{values.descripcion.length}/1000 caracteres</p><ErrorAlert error={error} /><button className="button button-primary" type="submit" disabled={busy || catalogs.loading || Boolean(catalogs.error)}>{busy ? 'Enviando solicitud…' : 'Enviar solicitud'}</button></form><Link to="/estado-solicitud" className="text-button inline-flex mt-4">Ya envié mi solicitud</Link></AuthFrame>;
}
