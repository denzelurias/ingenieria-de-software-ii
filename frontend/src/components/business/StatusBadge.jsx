export default function StatusBadge({ business, esta_abierto = business?.esta_abierto, en_horario_ahora = business?.en_horario_ahora }) {
  const open = esta_abierto === true || esta_abierto === 1;
  return <span className="inline-flex flex-col gap-1 text-xs"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-bold ${open ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}><span aria-hidden="true">●</span>{open ? 'Abierto' : 'Cerrado'}</span>{open && en_horario_ahora === false && <span className="text-slate-600">Fuera de su horario habitual</span>}</span>;
}
