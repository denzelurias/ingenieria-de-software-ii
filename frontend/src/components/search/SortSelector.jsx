export default function SortSelector({ value = 'open_now', mode = 'businesses', onChange }) {
  const options = mode === 'products' ? [['open_now', 'Abiertos primero'], ['alpha_asc', 'Nombre A–Z'], ['price_asc', 'Menor precio'], ['price_desc', 'Mayor precio']] : [['open_now', 'Abiertos primero'], ['alpha_asc', 'Nombre A–Z'], ['alpha_desc', 'Nombre Z–A'], ['proximity', 'Cercanía a mi zona']];
  return <label className="text-sm flex items-center flex-wrap gap-2">Ordenar<select value={value} onChange={event => onChange(event.target.value)}>{options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>;
}
