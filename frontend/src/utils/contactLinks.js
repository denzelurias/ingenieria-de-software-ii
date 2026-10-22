export function getContactLink(contact, businessName = '') {
  const value = String(contact?.valor ?? '').trim();
  const phone = /^\d{10}$/.test(value);
  switch (contact?.tipo_contacto) {
    case 'whatsapp': return phone ? `https://wa.me/52${value}?text=${encodeURIComponent(`Hola, vi tu negocio${businessName ? ` ${businessName}` : ''} en EmprendeBúho UNISON y me gustaría conocer más.`)}` : null;
    case 'telefono': return phone ? `tel:+52${value}` : null;
    case 'instagram': return /^[A-Za-z0-9._]{1,30}$/.test(value) ? `https://instagram.com/${value}` : null;
    case 'tiktok': return /^[A-Za-z0-9._]{1,30}$/.test(value) ? `https://www.tiktok.com/@${value}` : null;
    case 'facebook':
    case 'otro':
      try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
      catch { return null; }
    default: return null;
  }
}
export const contactLabels = { whatsapp: 'WhatsApp', telefono: 'Llamar', instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', otro: 'Sitio web' };
