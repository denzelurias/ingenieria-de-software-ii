import { FlaskConical } from 'lucide-react';
export default function DevCodeBox({ code }) {
  if (!import.meta.env.DEV || !/^\d{6}$/.test(String(code ?? ''))) return null;
  return <aside className="dev-code" aria-label="Código de recuperación de desarrollo"><FlaskConical size={20} aria-hidden="true" /><div><strong>Modo de desarrollo local</strong><p>Tu código de recuperación es <code>{code}</code>. Vence en 15 minutos.</p></div></aside>;
}
