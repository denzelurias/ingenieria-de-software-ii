import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AuthFrame, FormField, validPassword, passwordHint } from './LoginPage.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
export default function ResetPasswordPage() {
  const { state } = useLocation(); const auth = useAuth();
  const [done, setDone] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(null); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const submit = async event => {
    event.preventDefault(); if (busy) return;
    if (!validPassword(password) || password !== confirmation) { setError(new Error(password !== confirmation ? 'Las contraseñas no coinciden.' : passwordHint)); return; }
    const form = new FormData(event.currentTarget); setBusy(true); setError(null);
    try { await api.post('/auth/reset-password', { email_institucional: form.get('email_institucional').trim().toLowerCase(), codigo_recuperacion: form.get('codigo_recuperacion'), nueva_password: password }, { auth: false }); auth.logout(); setPassword(''); setConfirmation(''); setDone(true); }
    catch (failure) { setError(failure); } finally { setBusy(false); }
  };
  return <AuthFrame title="Restablecer contraseña" description="El código tiene 6 dígitos, vence en 15 minutos y permite hasta 5 intentos.">{done ? <div className="grid gap-4"><p role="status">Tu contraseña cambió. Las sesiones anteriores fueron cerradas.</p><Link to="/login" className="button button-primary">Iniciar sesión</Link></div> : <><form className="grid gap-4" onSubmit={submit}><FormField label="Correo institucional" name="email_institucional" type="email" defaultValue={state?.email || ''} required autoComplete="email" maxLength={254} /><FormField label="Código de recuperación" name="codigo_recuperacion" required pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code" /><FormField label="Nueva contraseña" name="nueva_password" type="password" required minLength={8} maxLength={72} value={password} onChange={event => setPassword(event.target.value)} error={password && !validPassword(password) ? passwordHint : null} autoComplete="new-password" /><FormField label="Confirmar contraseña" name="confirmacion" type="password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} error={confirmation && password !== confirmation ? 'Las contraseñas no coinciden.' : null} autoComplete="new-password" /><ErrorAlert error={error} /><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Restableciendo…' : 'Cambiar contraseña'}</button></form><Link className="text-button inline-flex mt-4" to="/recuperar-password">Solicitar otro código</Link></>}</AuthFrame>;
}
