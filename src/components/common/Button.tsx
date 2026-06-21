import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes, forwardRef, ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'warning'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  className?: string
  as?: ElementType
  children?: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-medical-600 text-white hover:bg-medical-700 active:bg-medical-800',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 border border-gray-200',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
  success: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700',
  warning: 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700',
  outline: 'border-2 border-medical-600 text-medical-600 hover:bg-medical-50 active:bg-medical-100 bg-transparent',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
}

const Button = forwardRef<HTMLElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      fullWidth = false,
      onClick,
      children,
      className,
      as: Component = 'button',
      ...props
    },
    ref
  ) => {
    const baseClasses = cn(
      'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && 'w-full',
      variant === 'primary' && 'focus:ring-medical-500',
      variant === 'secondary' && 'focus:ring-gray-400',
      variant === 'danger' && 'focus:ring-red-400',
      variant === 'success' && 'focus:ring-green-400',
      variant === 'warning' && 'focus:ring-orange-400',
      variant === 'outline' && 'focus:ring-medical-500',
      className
    );

    if (Component === 'button') {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          onClick={!loading && !disabled ? onClick : undefined}
          disabled={disabled || loading}
          className={baseClasses}
          {...props}
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {children}
        </button>
      );
    }

    return (
      <Component
        ref={ref}
        onClick={!loading && !disabled ? onClick : undefined}
        className={baseClasses}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </Component>
    );
  }
)

Button.displayName = 'Button'

export { Button }
