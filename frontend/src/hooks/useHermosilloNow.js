import { useEffect, useMemo, useState } from 'react';
import { TIME_ZONE } from '../utils/constants.js';
const formatter = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export function useHermosilloNow() {
  const [date, setDate] = useState(() => new Date());
  useEffect(() => {
    let timer;
    const tick = () => { setDate(new Date()); clearTimeout(timer); timer = setTimeout(tick, 60000 - Date.now() % 60000 + 10); };
    const visible = () => { if (document.visibilityState === 'visible') tick(); };
    tick(); document.addEventListener('visibilitychange', visible);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', visible); };
  }, []);
  return useMemo(() => {
    const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
    return { date, dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday), time: `${parts.hour}:${parts.minute}`, timeZone: TIME_ZONE };
  }, [date]);
}
export default useHermosilloNow;
