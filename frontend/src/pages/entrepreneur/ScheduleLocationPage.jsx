import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import CampusZoneSelector from '../../components/search/CampusZoneSelector.jsx';
import Toggle from '../../components/common/Toggle.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import Spinner from '../../components/common/Spinner.jsx';

const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export default function ScheduleLocationPage() {
  const context = useOutletContext();
  if (!context.business) return <Spinner label="Cargando horarios y ubicación…" />;
  return <ScheduleLocationEditor key={context.business.id} {...context} />;
}
function ScheduleLocationEditor({ business, refreshBusiness }) {
  const auth = useAuth(); const toast = useToast();
  const catalogs = useApi(({ signal }) => api.get('/catalogs', { signal, auth: false }));
  const [zone, setZone] = useState(String(business.campus_zone_id ?? ''));
  const [detail, setDetail] = useState(business.ubicacion_detalle ?? '');
  // null sigue al control maestro; un booleano representa una edición local pendiente.
  const [visibility, setVisibility] = useState(null);
  const showLocation = visibility ?? business.mostrar_ubicacion;
  const [schedules, setSchedules] = useState(() => days.map((_, dia_semana) => {
    const day = business.schedules.find(item => item.dia_semana === dia_semana);
    return { dia_semana, cerrado_todo_el_dia: day?.cerrado_todo_el_dia ?? true, hora_apertura: day?.hora_apertura ?? '', hora_cierre: day?.hora_cierre ?? '' };
  }));
  const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  const changeDay = (day, patch) => setSchedules(previous => previous.map(item => item.dia_semana === day ? { ...item, ...patch } : item));
  const save = async (operation, message) => {
    if (busy) return; setBusy(true); setError(null);
    try { const response = await operation(); auth.setBusiness(response.data); await refreshBusiness(); toast.success(message); }
    catch (failure) { setError(failure); } finally { setBusy(false); }
  };
  const saveLocation = event => {
    event.preventDefault();
    void save(async () => {
      if (showLocation && !zone) throw new Error('Selecciona una zona antes de mostrar tu ubicación.');
      const body = { mostrar_ubicacion: showLocation, ubicacion_detalle: detail.trim() };
      if (zone !== String(business.campus_zone_id ?? '')) body.campus_zone_id = zone ? Number(zone) : null;
      const response = await api.patch('/my-business/location', body);
      setVisibility(null); setDetail(response.data.ubicacion_detalle ?? ''); return response;
    }, 'Ubicación y privacidad actualizadas.');
  };
  const saveSchedules = event => {
    event.preventDefault();
    void save(async () => {
      const invalid = schedules.find(day => !day.cerrado_todo_el_dia && (!day.hora_apertura || !day.hora_cierre || day.hora_apertura >= day.hora_cierre));
      if (invalid) throw new Error(`Revisa ${days[invalid.dia_semana]}: la apertura debe ser anterior al cierre dentro del mismo día.`);
      return api.put('/my-business/schedules', { schedules: schedules.map(day => ({ ...day, hora_apertura: day.cerrado_todo_el_dia ? null : day.hora_apertura, hora_cierre: day.cerrado_todo_el_dia ? null : day.hora_cierre })) });
    }, 'Horario semanal actualizado.');
  };
  return <div className="grid gap-6"><header><h2 className="text-2xl font-bold text-unison-blue">Horarios y ubicación</h2><p className="text-slate-600 mt-2">Comparte una zona aproximada y tus horarios habituales.</p></header><ErrorAlert error={error} />
    <form onSubmit={saveLocation} className="surface p-5"><fieldset disabled={busy} className="grid gap-4"><legend className="text-xl font-bold text-unison-blue mb-4">Ubicación y privacidad</legend>
      <ErrorAlert error={catalogs.error} onRetry={catalogs.refetch} />{catalogs.loading ? <Spinner label="Cargando zonas…" /> : <CampusZoneSelector zones={catalogs.data?.campus_zones} value={zone} onChange={setZone} />}
      {business.campus_zone_id && catalogs.data && !catalogs.data.campus_zones.some(item => item.id === business.campus_zone_id) && zone === String(business.campus_zone_id) && <p className="field-hint">Tu zona guardada ya no está disponible para nuevas selecciones. Puedes conservarla o elegir otra.</p>}
      <label className="field-label">Referencia aproximada (opcional)<input className="w-full mt-2" name="ubicacion_detalle" maxLength={120} value={detail} onChange={event => setDetail(event.target.value)} /></label><p className="field-hint">{detail.length}/120 caracteres. Evita compartir direcciones particulares.</p>
      <Toggle checked={showLocation} label="Mostrar ubicación en el perfil público" description="Al ocultarla, conservas la zona y referencia en privado. No aparecerás al filtrar por zona." onChange={setVisibility} disabled={busy} />
      <button type="submit" className="button button-primary justify-self-start">Guardar ubicación</button>
    </fieldset></form>
    <form onSubmit={saveSchedules} className="surface p-5"><fieldset disabled={busy} className="grid gap-4"><legend className="text-xl font-bold text-unison-blue mb-4">Horario semanal</legend><p className="text-sm text-slate-600">Hora de Hermosillo. El cierre no se incluye en el intervalo. Este horario es informativo y no cambia automáticamente el estado Abierto/Cerrado.</p>
      {[1, 2, 3, 4, 5, 6, 0].map(day => { const item = schedules[day]; return <fieldset key={day} className="border border-slate-200 rounded-xl p-4 min-w-0 grid gap-3"><legend className="font-semibold text-unison-blue px-1">{days[day]}</legend><Toggle label="Cerrado todo el día" checked={item.cerrado_todo_el_dia} onChange={cerrado_todo_el_dia => changeDay(day, { cerrado_todo_el_dia })} disabled={busy} /><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-sm">Apertura<input className="w-full mt-2" name={`apertura_${day}`} type="time" disabled={item.cerrado_todo_el_dia} required={!item.cerrado_todo_el_dia} value={item.hora_apertura} onChange={event => changeDay(day, { hora_apertura: event.target.value })} /></label><label className="text-sm">Cierre<input className="w-full mt-2" name={`cierre_${day}`} type="time" disabled={item.cerrado_todo_el_dia} required={!item.cerrado_todo_el_dia} value={item.hora_cierre} onChange={event => changeDay(day, { hora_cierre: event.target.value })} /></label></div></fieldset>; })}
      <button type="submit" className="button button-primary justify-self-start">Guardar horarios</button>
    </fieldset></form>
  </div>;
}
