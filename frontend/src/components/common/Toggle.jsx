import { useId } from 'react';
export default function Toggle({ checked, onChange, label, description, disabled = false, id: providedId, ...props }) {
  const generatedId = useId(); const id = providedId ?? generatedId;
  return <div className="toggle-field"><div><label id={`${id}-label`} htmlFor={id}>{label}</label>{description && <p id={`${id}-hint`}>{description}</p>}</div>
    <button {...props} id={id} type="button" className="toggle" role="switch" aria-checked={Boolean(checked)} aria-labelledby={`${id}-label`}
      aria-describedby={description ? `${id}-hint` : undefined} disabled={disabled} onClick={() => onChange?.(!checked)}><span aria-hidden="true" /></button></div>;
}
