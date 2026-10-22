const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export default function ScheduleTable({ schedules = [], currentDay }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm text-left"><caption className="text-left text-slate-600 py-3">Horario habitual · Hora de Hermosillo</caption><thead><tr><th scope="col" className="p-3">Día</th><th scope="col" className="p-3">Horario</th></tr></thead><tbody>{[1, 2, 3, 4, 5, 6, 0].map(day => {
    const schedule = schedules.find(item => item.dia_semana === day);
    return <tr key={day} className={currentDay === day ? 'bg-unison-gold-soft border-l-4 border-unison-gold' : 'border-t border-slate-100'}><th scope="row" className="p-3">{days[day]}{currentDay === day ? ' · Hoy' : ''}</th><td className="p-3">{!schedule || schedule.cerrado_todo_el_dia ? 'Cerrado' : `${schedule.hora_apertura} – ${schedule.hora_cierre}`}</td></tr>;
  })}</tbody></table></div>;
}
