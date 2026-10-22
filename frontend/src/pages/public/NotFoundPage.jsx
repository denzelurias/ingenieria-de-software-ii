import { Link } from 'react-router';
import EmptyState from '../../components/common/EmptyState.jsx';
export default function NotFoundPage({ title = 'No encontramos esta página' }) {
  return <EmptyState title={title} description="La dirección puede haber cambiado o el contenido ya no está disponible." action={<Link to="/" className="button button-primary">Volver al directorio</Link>} />;
}
