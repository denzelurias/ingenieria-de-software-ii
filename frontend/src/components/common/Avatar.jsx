import { useState } from 'react';
import { getInitials } from '../../utils/format.js';
const backgrounds = ['#002D62', '#004B9B', '#6D28D9', '#166534', '#9D174D', '#334155'];
export default function Avatar({ src, name = 'EmprendeBúho', categoryId = 0, size = 48, className = '' }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const color = backgrounds[Math.abs(Number(categoryId) || 0) % backgrounds.length];
  return <span className={`avatar ${className}`} style={{ width: size, height: size, backgroundColor: color }}>
    {src && src !== failedSrc ? <img src={src} alt={name} width={size} height={size} loading="lazy" onError={() => setFailedSrc(src)} /> : <span role="img" aria-label={name}>{getInitials(name)}</span>}</span>;
}
