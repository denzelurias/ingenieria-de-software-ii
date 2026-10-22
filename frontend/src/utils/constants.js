export const TOKEN_KEY = 'emprendebuho_token';
export const FAVORITES_KEY = 'emprendebuho_favorites';
export const SESSION_EXPIRED_EVENT = 'emprendebuho:session-expired';
export const TIME_ZONE = 'America/Hermosillo';
export const MAX_FAVORITES = 100;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ENTREPRENEUR_LINKS = [
  { to: '/panel', label: 'Inicio', icon: 'LayoutDashboard', end: true },
  { to: '/panel/perfil', label: 'Mi perfil', icon: 'Store' },
  { to: '/panel/catalogo', label: 'Catálogo', icon: 'Package' },
  { to: '/panel/horarios', label: 'Horarios y ubicación', icon: 'Clock' },
  { to: '/panel/vista-previa', label: 'Vista previa', icon: 'Eye' },
  { to: '/panel/notificaciones', label: 'Notificaciones', icon: 'Bell' },
  { to: '/panel/cuenta', label: 'Mi cuenta', icon: 'UserRound' }
];
export const ADMIN_LINKS = [
  { to: '/admin', label: 'Resumen', icon: 'LayoutDashboard', end: true },
  { to: '/admin/solicitudes', label: 'Solicitudes', icon: 'UserCheck' },
  { to: '/admin/reportes', label: 'Reportes', icon: 'Flag' },
  { to: '/admin/moderacion', label: 'Moderación', icon: 'ShieldCheck' },
  { to: '/admin/categorias', label: 'Categorías', icon: 'Tags' },
  { to: '/admin/mantenimiento', label: 'Mantenimiento', icon: 'Settings' }
];
