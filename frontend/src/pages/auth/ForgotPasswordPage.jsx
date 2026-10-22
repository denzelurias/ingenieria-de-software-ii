import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../services/api.js';
import { AuthFrame, FormField } from './LoginPage.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import DevCodeBox from '../../components/common/DevCodeBox.jsx';
export default function ForgotPasswordPage() {
  const [result, setResult] = useState(null); const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  const submit = async event => {
    event.preventDefault(); if (busy) return; setBusy(true); setError(null); setResult(null);
    try { const response = await api.post('/auth/forgot-password', { email_institucional: email.trim().toLowerCase() }, { auth: false }); setResult(response.data); }
    catch (failure) { setError(failure); } finally { setBusy(false); }
  };
  return <AuthFrame title="Recuperar contraseña" description="Solicita un código de recuperación para tu cuenta."><form className="grid gap-4" onSubmit={submit}><FormField label="Correo institucional" name="email_institucional" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required maxLength={254} /><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Solicitando…' : 'Solicitar código'}</button></form><ErrorAlert error={error} />{result && <div className="grid gap-4 mt-5"><p role="status">Si existe una cuenta vigente asociada a ese correo, se generó un código de recuperación.</p><DevCodeBox code={result.dev_codigo} /><Link className="button button-primary" to="/restablecer-password" state={{ email: email.trim().toLowerCase() }}>Ya tengo mi código</Link></div>}<Link className="text-button inline-flex mt-3" to="/login">Volver a iniciar sesión</Link></AuthFrame>;
}
