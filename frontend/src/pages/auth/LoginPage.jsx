import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import Spinner from '../../components/common/Spinner.jsx';

export function AuthFrame({ title, description, children }) {
  return <section className="surface p-5 md:p-8 max-w-xl mx-auto w-full"><h1 className="text-3xl font-heading text-unison-blue">{title}</h1>{description && <p className="text-slate-600 mt-3 mb-6">{description}</p>}{children}</section>;
}
export function FormField({ label, name, error, ...props }) {
  return <label className="field-label" htmlFor={name}>{label}<input id={name} name={name} className="w-full mt-2" aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} {...props} />{error && <span id={`${name}-error`} className="field-error block">{error}</span>}</label>;
}
export const validPassword = value => value.length >= 8 && value.length <= 72 && /\p{L}/u.test(value) && /\d/.test(value);
export const passwordHint = 'Usa de 8 a 72 caracteres, con al menos una letra y un número.';
export default function LoginPage() {
  const auth = useAuth(); const location = useLocation(); const navigate = useNavigate();
  const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  if (auth.loading) return <div className="page-loader"><Spinner label="Comprobando sesión…" /></div>;
  if (auth.isAuthenticated) return <Navigate to={auth.user.rol === 'admin' ? '/admin' : '/panel'} replace />;
  const submit = async event => {
    event.preventDefault(); if (busy) return;
    const fields = new FormData(event.currentTarget); setBusy(true); setError(null);
    try {
      const result = await auth.login(fields.get('identificador').trim(), fields.get('password'));
      if (!result) return;
      const from = location.state?.from;
      const safeFrom = typeof from === 'string' && (result.user.rol === 'admin' ? /^\/admin(?:[/?]|$)/.test(from) : /^\/panel(?:[/?]|$)/.test(from));
      navigate(safeFrom ? from : result.user.rol === 'admin' ? '/admin' : '/panel', { replace: true });
    } catch (failure) {
      if (['ACCOUNT_PENDING', 'ACCOUNT_REJECTED', 'ACCOUNT_SUSPENDED'].includes(failure.code)) navigate('/estado-cuenta', { replace: true, state: { account: failure.details, message: failure.message } });
      else setError(failure);
    } finally { setBusy(false); }
  };
  return <AuthFrame title="Acceso emprendedor" description="Ingresa con tu correo institucional o matrícula UNISON."><form onSubmit={submit} className="grid gap-4"><FormField label="Correo institucional o matrícula" name="identificador" required maxLength={254} autoComplete="username" /><FormField label="Contraseña" name="password" type="password" required maxLength={256} autoComplete="current-password" /><ErrorAlert error={error} /><button className="button button-primary" type="submit" disabled={busy}>{busy ? <Spinner label="Ingresando…" /> : 'Iniciar sesión'}</button></form><div className="grid mt-4"><Link className="text-button" to="/recuperar-password">Olvidé mi contraseña</Link><Link className="text-button" to="/registro">Solicitar cuenta de emprendedor</Link><Link className="text-button" to="/estado-solicitud">Consultar mi solicitud</Link></div></AuthFrame>;
}
