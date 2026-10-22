import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { Store } from 'lucide-react';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ENTREPRENEUR_LINKS } from '../../utils/constants.js';
import Toggle from '../common/Toggle.jsx';
import ErrorAlert from '../common/ErrorAlert.jsx';
import Spinner from '../common/Spinner.jsx';
export default function EntrepreneurLayout() {
  const auth = useAuth(); const toast = useToast();
  const resource = useApi(options => api.get('/my-business', options));
  const [business, setBusiness] = useState(null); const [busy, setBusy] = useState(false); const inFlight = useRef(false);
  useEffect(() => { if (resource.data) setBusiness(resource.data); }, [resource.data]);
  async function update(path, body) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try { const result = await api.patch(path, body); setBusiness(result.data); auth.setBusiness(result.data); toast.success('La información de tu negocio se actualizó.'); }
    catch (error) { toast.error(error.message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <main id="contenido" tabIndex={-1} className="container panel-space"><div className="panel-heading"><span className="eyebrow">ESPACIO EMPRENDEDOR</span><h1><Store size={28} aria-hidden="true" />{business?.nombre_negocio ?? auth.business?.nombre_negocio ?? 'Mi negocio'}</h1><p>Tu proyecto tiene un lugar en el campus.</p></div>
    <div className="business-controls" aria-busy={busy || resource.loading}><Toggle label={business?.esta_abierto ? 'Abierto · Atendiendo ahora' : 'Cerrado'} description="Indica si puedes atender en este momento."
      checked={business?.esta_abierto} disabled={!business || busy} onChange={esta_abierto => update('/my-business/open-status', { esta_abierto })} />
      <Toggle label={business?.mostrar_ubicacion ? 'Ubicación visible' : 'Ubicación privada'} description="Comparte tu zona del campus solo cuando quieras."
        checked={business?.mostrar_ubicacion} disabled={!business || busy} onChange={mostrar_ubicacion => update('/my-business/location', { mostrar_ubicacion })} /></div>
    {resource.loading && !business && <Spinner label="Cargando tu negocio…" />}<ErrorAlert error={resource.error} onRetry={() => resource.refetch()} />
    <nav className="panel-nav" aria-label="Secciones de mi negocio">{ENTREPRENEUR_LINKS.map(link => <NavLink className="section-link" key={link.to} to={link.to} end={link.end}>{link.label}</NavLink>)}</nav>
    <div className="panel-content"><Outlet context={{ business, refreshBusiness: resource.refetch }} /></div></main>;
}
