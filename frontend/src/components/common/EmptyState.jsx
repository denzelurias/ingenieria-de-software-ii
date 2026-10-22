import { Sprout } from 'lucide-react';
export default function EmptyState({ icon: Icon = Sprout, title = 'Aún no hay información', description, action, children }) {
  return <section className="empty-state"><span className="empty-icon"><Icon size={30} strokeWidth={1.5} aria-hidden="true" /></span><h2>{title}</h2>{description && <p>{description}</p>}{children}{action && <div className="empty-action">{action}</div>}</section>;
}
