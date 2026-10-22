import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce.js';
export default function SearchBar({ value = '', onChange, mode = 'businesses', onModeChange }) {
  const [draft, setDraft] = useState(value); const debounced = useDebounce(draft, 300); const edited = useRef(false); const callback = useRef(onChange); callback.current = onChange;
  useEffect(() => { edited.current = false; setDraft(value); }, [value]);
  useEffect(() => { if (edited.current && debounced === draft) { edited.current = false; callback.current(debounced.trim()); } }, [debounced, draft]);
  return <div className="grid gap-3"><div className="flex gap-2" aria-label="Tipo de búsqueda">{[['businesses', 'Negocios'], ['products', 'Productos']].map(([key, label]) => <button type="button" key={key} className={`button ${mode === key ? 'button-primary' : 'button-secondary'}`} aria-pressed={mode === key} onClick={() => onModeChange?.(key)}>{label}</button>)}</div><label className="relative block"><span className="sr-only">Buscar {mode === 'products' ? 'productos' : 'negocios'}</span><Search className="absolute left-3 top-3.5 text-slate-500" size={20} aria-hidden="true" /><input type="search" className="w-full pl-11!" maxLength={60} placeholder={mode === 'products' ? 'Busca un producto o su descripción' : 'Busca negocios, descripciones o productos'} value={draft} onChange={event => { edited.current = true; setDraft(event.target.value); }} /></label>{draft.trim().length === 1 && <p className="field-hint">Escribe al menos 2 caracteres para buscar.</p>}</div>;
}
