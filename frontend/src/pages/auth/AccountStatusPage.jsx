import { Link, useLocation } from 'react-router';
import { formatDate } from '../../utils/format.js';
import { AuthFrame } from './LoginPage.jsx';
const labels = { pendiente: 'Solicitud pendiente de revisión', aprobada: 'Cuenta aprobada', rechazada: 'Solicitud rechazada', suspendida: 'Cuenta suspendida', eliminada: 'Cuenta eliminada' };
export function AccountStatusDetails({ account, message }) {
  if (!account?.estado_cuenta || !labels[account.estado_cuenta]) return <><p className="text-slate-600">Para consultar tu estado, verifica tu correo y matrícula o inicia sesión.</p><Link to="/estado-solicitud" className="button button-primary mt-4">Consultar solicitud</Link></>;
  return <div className="grid gap-4" role="status"><h2 className="text-xl font-semibold text-unison-blue">{labels[account.estado_cuenta]}</h2>{message && <p>{message}</p>}{account.nombre_negocio && <p>{account.nombre_negocio}</p>}{account.motivo_estado && <p className="p-4 bg-unison-gold-soft text-unison-blue rounded-xl whitespace-pre-wrap break-words">Motivo: {account.motivo_estado}</p>}{(account.created_at || account.fecha_solicitud) && <p>Solicitud: {formatDate(account.created_at || account.fecha_solicitud)}</p>}{account.fecha_resolucion && <p>Resolución: {formatDate(account.fecha_resolucion)}</p>}{account.suspendida_hasta && <p>Suspensión hasta: {formatDate(account.suspendida_hasta)}</p>}{account.estado_cuenta === 'pendiente' && <p>Administración revisará tu credencial y los datos de tu negocio. Podrás ingresar cuando se apruebe tu cuenta.</p>}{['rechazada', 'eliminada'].includes(account.estado_cuenta) && <><p>Puedes enviar una nueva solicitud utilizando el mismo correo y matrícula.</p><Link to="/registro" className="button button-primary">Volver a solicitar registro</Link></>}{account.estado_cuenta === 'aprobada' && <Link to="/login" className="button button-primary">Iniciar sesión</Link>}<Link className="text-button" to="/estado-solicitud">Volver a consultar mi solicitud</Link><Link className="text-button" to="/explorar">Explorar negocios</Link></div>;
}
export default function AccountStatusPage() {
  const { state } = useLocation();
  return <AuthFrame title="Estado de tu cuenta" description="Información de tu acceso a EmprendeBúho."><AccountStatusDetails account={state?.account} message={state?.message} /></AuthFrame>;
}
