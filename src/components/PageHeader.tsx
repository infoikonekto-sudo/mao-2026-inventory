interface PageHeaderProps {
  title: string
  description?: string
  icon?: string
  showLogo?: boolean
}

export default function PageHeader({
  title,
  description,
  icon = '📄',
  showLogo = true
}: PageHeaderProps) {
  return (
    <div className="flex items-center gap-4 card p-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-primary">
      {showLogo && (
        <img
          src="/logo-mao.png"
          alt="Logo MAO"
          className="w-16 h-16 object-contain flex-shrink-0"
        />
      )}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {title}
        </h1>
        {description && (
          <p className="text-gray-600 mt-1">{description}</p>
        )}
        <p className="text-xs text-gray-500 mt-2">MAO 2026 - Sistema de Gestión Integral</p>
      </div>
    </div>
  )
}
