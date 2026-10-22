import { useId } from 'react';
export default function PriceRangeFilter({ min = '', max = '', onChange }) {
  const id = useId();
  return <fieldset className="grid gap-2"><legend className="field-label">Rango de precios (MXN)</legend><div className="grid grid-cols-2 gap-3"><label htmlFor={`${id}-min`} className="text-sm">Desde<input id={`${id}-min`} className="w-full mt-1" type="number" min="0" step="0.01" placeholder="$0" value={min} onChange={event => onChange({ min_price: event.target.value })} /></label><label htmlFor={`${id}-max`} className="text-sm">Hasta<input id={`${id}-max`} className="w-full mt-1" type="number" min="0" step="0.01" placeholder="$500 o más" value={max} onChange={event => onChange({ max_price: event.target.value })} /></label></div>{min !== '' && max !== '' && Number(min) > Number(max) && <p role="alert" className="field-error">El máximo debe ser mayor o igual al mínimo.</p>}</fieldset>;
}
