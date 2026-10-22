import { LoaderCircle } from 'lucide-react';
export default function Spinner({ label = 'Cargando…', className = '' }) {
  return <span className={`spinner ${className}`} role="status"><LoaderCircle className="spin" size={22} aria-hidden="true" /><span>{label}</span></span>;
}
