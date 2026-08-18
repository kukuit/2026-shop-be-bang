type StarIconProps = {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

const SIZE_CLASSES = {
  small: 'text-[clamp(16px,4.6cqw,20px)]',
  medium: 'text-[clamp(23px,6.7cqw,27px)]',
  large: 'text-[clamp(34px,11cqw,48px)]',
} as const

export default function StarIcon({ size = 'medium', className = '' }: StarIconProps) {
  return <span className={`inline-grid shrink-0 place-items-center leading-none ${SIZE_CLASSES[size]} ${className}`} aria-hidden="true">★</span>
}
