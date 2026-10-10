interface IconProps {
  name: string
  className?: string
  filled?: boolean
  size?: number
}

export function Icon({ name, className = '', filled = false, size = 20 }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      aria-hidden="true"
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 500, 'GRAD' 0, 'opsz' 24`,
      }}
    >
      {name}
    </span>
  )
}