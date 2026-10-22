import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';

export default function AccountSettingsPage() {
  const auth = useAuth(); const toast = useToast(); const navigate = useNavigate();
  const [open, setOpen] = useState(false); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const removeAccount = async () => {
    if (!password) throw new Error('Escribe tu contraseña actual para confirmar la eliminación.');
    setBusy(true);
    try {
      await api.delete('/auth/my-account', { password_actual: password });
      setPassword(''); auth.logout(); navigate('/', { replace: true });
      toast.success('Tu cuenta fue eliminada y tu negocio dejó de ser público.');
    } finally { setBusy(false); }
  };
  return <div className="grid gap-6">
    <header><h2 className="text-2xl font-bold text-unison-blue">Mi cuenta</h2><p className="mt-2 text-slate-600">Consulta tus datos de acceso y administra tu cuenta.</p></header>
    <section className="surface p-5 grid gap-4"><h3 className="text-xl font-bold text-unison-blue">Datos de la cuenta</h3><dl className="grid gap-4">{[['Nombre', auth.user.nombre_completo], ['Correo institucional', auth.user.email_institucional], ['Matrícula UNISON', auth.user.matricula_unison], ['Estado', auth.user.estado_cuenta === 'aprobada' ? 'Aprobada' : auth.user.estado_cuenta]].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="font-semibold break-words">{value}</dd></div>)}</dl><p className="text-sm text-slate-600">El correo y la matrícula identifican tu solicitud institucional y no se editan desde el panel.</p><Link className="text-button justify-self-start" to="/recuperar-password">Restablecer mi contraseña</Link></section>
    <section className="surface p-5 border-red-300! grid gap-4"><h3 className="text-xl font-bold text-red-800">Zona de peligro</h3><p className="text-sm text-slate-600">Eliminar tu cuenta cierra el negocio, oculta su perfil y revoca las sesiones activas. Para volver a participar necesitarás enviar una nueva solicitud.</p><button type="button" className="button button-danger justify-self-start" onClick={() => setOpen(true)}>Cerrar mi negocio y eliminar mi cuenta</button></section>
    <ConfirmDialog open={open} title="Eliminar mi cuenta" description="Confirma con tu contraseña actual. Tu negocio dejará de aparecer en el directorio." destructive confirmLabel="Eliminar mi cuenta" onConfirm={removeAccount} onClose={() => { setOpen(false); setPassword(''); }}>
      <label className="field-label mt-5">Contraseña actual<input type="password" className="w-full mt-2" name="password_actual" autoComplete="current-password" value={password} maxLength={256} onChange={event => setPassword(event.target.value)} disabled={busy} /></label>
    </ConfirmDialog>
  </div>;
}
