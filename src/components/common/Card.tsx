import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  title?: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
  className?: string
  footer?: ReactNode
  headerClass?: string
  bodyClass?: string
}

export function Card({
  title,
  subtitle,
  children,
  className,
  footer,
  headerClass,
  bodyClass,
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-md overflow-hidden',
        className
      )}
    >
      {(title || subtitle) && (
        <div
          className={cn(
            'px-6 py-4 border-b border-gray-100',
            headerClass
          )}
        >
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children && (
        <div className={cn('px-6 py-4', bodyClass)}>
          {children}
        </div>
      )}
      {footer && (
        <div className="px-6 py-4 border-t border-gray-100">
          {footer}
        </div>
      )}
    </div>
  )
}
