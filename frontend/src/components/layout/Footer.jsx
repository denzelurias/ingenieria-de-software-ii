import { GraduationCap, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
export default function Footer() {
  return <footer className="site-footer">
    <div className="container pt-12 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-brand-cobalt/60">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 font-heading text-2xl font-black text-white">
            <span className="w-9 h-9 rounded-xl bg-brand-cobalt flex items-center justify-center text-brand-gold shadow-sm">
              <GraduationCap size={21} aria-hidden="true" />
            </span>
            <span>Emprende<span className="text-brand-gold">Búho</span></span>
          </span>
          <p className="text-xs text-blue-200 leading-relaxed max-w-sm">
            Directorio estudiantil de emprendimientos universitarios en la Universidad de Sonora. Conectamos talento con nuestra comunidad mediante contacto directo.
          </p>
          <div className="flex items-center gap-2 pt-1 text-xs text-brand-gold font-bold">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Verificación con Credencial y Correo Institucional @unison.mx</span>
          </div>
        </div>
        <div className="space-y-2.5 text-xs">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-brand-gold">Explorar Directorio</h3>
          <ul className="space-y-2 text-blue-200">
            <li><Link to="/explorar" className="hover:text-white transition-colors">Todos los negocios del campus</Link></li>
            <li><Link to="/explorar?mode=products" className="hover:text-white transition-colors">Catálogo de productos y servicios</Link></li>
            <li><Link to="/explorar?open_now=true" className="hover:text-white transition-colors">Abiertos y atendiendo ahora</Link></li>
            <li><Link to="/favoritos" className="hover:text-white transition-colors">Mis negocios favoritos</Link></li>
          </ul>
        </div>
        <div className="space-y-2.5 text-xs">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-brand-gold">Comunidad Emprendedora</h3>
          <ul className="space-y-2 text-blue-200">
            <li><Link to="/registro" className="hover:text-white transition-colors">Solicitar cuenta de emprendedor</Link></li>
            <li><Link to="/estado-solicitud" className="hover:text-white transition-colors">Consultar estado de mi solicitud</Link></li>
            <li><Link to="/login" className="hover:text-white transition-colors">Iniciar sesión en mi panel</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-content pt-6! pb-0!">
        <span><GraduationCap size={18} className="text-brand-gold" aria-hidden="true" />EmprendeBúho</span>
        <p>De estudiantes, para estudiantes · Impulsado por la comunidad estudiantil de Sonora.</p>
        <small className="font-bold text-brand-gold">UNISON · Campus Hermosillo</small>
      </div>
    </div>
  </footer>;
}
