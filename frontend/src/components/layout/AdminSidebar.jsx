import { LayoutDashboard, UserCheck, Flag, ShieldCheck, Tags, Settings } from 'lucide-react';
import { NavLink } from 'react-router';
import { ADMIN_LINKS } from '../../utils/constants.js';
const icons = { LayoutDashboard, UserCheck, Flag, ShieldCheck, Tags, Settings };
export default function AdminSidebar({ className = '' }) {
  return <aside className={`admin-sidebar ${className}`}><p className="eyebrow">ADMINISTRACIÓN</p><nav aria-label="Panel de administración">{ADMIN_LINKS.map(link => {
    const Icon = icons[link.icon]; return <NavLink className="sidebar-link" key={link.to} to={link.to} end={link.end}><Icon size={19} aria-hidden="true" />{link.label}</NavLink>;
  })}</nav><div className="sidebar-note"><ShieldCheck size={20} aria-hidden="true" /><p>Cuidamos una comunidad segura y confiable.</p></div></aside>;
}
