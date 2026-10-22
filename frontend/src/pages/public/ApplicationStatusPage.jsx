import { useState } from 'react';
import { api } from '../../services/api.js';
import { AuthFrame, FormField } from '../auth/LoginPage.jsx';
import { AccountStatusDetails } from '../auth/AccountStatusPage.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
export default function ApplicationStatusPage() {
  const [account, setAccount] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  const submit = async event => {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget); setBusy(true); setError(null); setAccount(null);
    try { const response = await api.post('/auth/request-status', { email_institucional: form.get('email_institucional').trim().toLowerCase(), matricula_unison: form.get('matricula_unison') }, { auth: false }); setAccount(response.data); }
    catch (failure) { setError(failure); } finally { setBusy(false); }
  };
  return <AuthFrame title="Estado de tu solicitud" description="Por privacidad, necesitamos tu correo institucional y tu matrícula para consultar el resultado."><form className="grid gap-4" onSubmit={submit}><FormField label="Correo institucional" name="email_institucional" type="email" required maxLength={254} autoComplete="email" /><FormField label="Matrícula UNISON" name="matricula_unison" required pattern="[0-9]{9}" minLength={9} maxLength={9} inputMode="numeric" autoComplete="off" /><button type="submit" className="button button-primary" disabled={busy}>{busy ? <Spinner label="Consultando…" /> : 'Consultar estado'}</button></form><ErrorAlert error={error} />{account && <div className="mt-6 pt-6 border-t border-slate-200"><AccountStatusDetails account={account} /></div>}</AuthFrame>;
}
