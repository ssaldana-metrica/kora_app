import { FlaskConical } from 'lucide-react'

/** Badge discreto pero visible para datos de demostración (Épica 5.2). */
export default function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 ${className}`}
      title="Estos datos son de demostración, no de un paciente real"
    >
      <FlaskConical size={11} />
      Datos de demostración
    </span>
  )
}
