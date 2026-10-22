import { MapPin, LockKeyhole } from 'lucide-react';
export default function ZoneBadge({ business }) {
  const visible = business?.mostrar_ubicacion === true || business?.mostrar_ubicacion === 1;
  return <span className="inline-flex items-start gap-2 text-sm text-slate-600">{visible ? <MapPin size={17} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}<span>{visible ? business.zona_nombre || 'Zona no disponible' : 'Ubicación privada — Acordar por mensaje'}</span></span>;
}
