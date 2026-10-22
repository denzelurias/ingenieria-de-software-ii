import { CircleAlert } from 'lucide-react';
export default function ErrorAlert({ error, message, onRetry, className = '' }) {
  if (!error && !message) return null;
  return <div className={`error-alert ${className}`} role="alert"><CircleAlert size={22} aria-hidden="true" /><div><p>{message ?? error?.message ?? 'Ocurrió un problema. Inténtalo de nuevo.'}</p>
    {Array.isArray(error?.details) && <ul>{error.details.filter(item => typeof item.message === 'string').map((item, index) => <li key={`${item.field}-${index}`}>{item.message}</li>)}</ul>}
    {onRetry && <button type="button" className="text-button" onClick={onRetry}>Volver a intentar</button>}</div></div>;
}
