import { Heart, MessageCircle, Phone, ExternalLink } from 'lucide-react';
import { getContactLink, contactLabels } from '../../utils/contactLinks.js';
export default function ContactButtons({ contacts = [], businessName, isFavorite = false, onToggleFavorite }) {
  return <div className="flex flex-wrap gap-2" aria-label="Contacto directo">{contacts.map(contact => {
    const href = getContactLink(contact, businessName);
    if (!href) return null;
    const Icon = contact.tipo_contacto === 'whatsapp' ? MessageCircle : contact.tipo_contacto === 'telefono' ? Phone : ExternalLink;
    return <a key={contact.id ?? `${contact.tipo_contacto}-${contact.valor}`} className={`button ${contact.tipo_contacto === 'whatsapp' ? 'button-primary' : 'button-secondary'}`} href={href} target={href.startsWith('tel:') ? undefined : '_blank'} rel="noopener noreferrer"><Icon size={18} aria-hidden="true" />{contactLabels[contact.tipo_contacto]}{contact.etiqueta ? ` · ${contact.etiqueta}` : ''}</a>;
  })}{onToggleFavorite && <button className="button button-secondary" type="button" aria-pressed={isFavorite} onClick={onToggleFavorite}><Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />{isFavorite ? 'Guardado' : 'Guardar'}</button>}</div>;
}
