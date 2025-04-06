import React, { forwardRef } from 'react';
import { cn } from '../../utils/format.utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'default',
    size = 'md',
    isLoading = false,
    className,
    children,
    leftIcon,
    rightIcon,
    fullWidth = false,
    ...props
  }, ref) => {
    // Base styles
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
    
    // Size variants
    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5',
      md: 'text-sm px-4 py-2',
      lg: 'text-base px-6 py-3',
      icon: 'p-2'
    };
    
    // Color/style variants
    const variantStyles = {
      default: 'bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500',
      secondary: 'bg-zinc-700 text-white hover:bg-zinc-600 focus:ring-zinc-500',
      danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500',
      ghost: 'bg-transparent hover:bg-zinc-800 text-zinc-300 focus:ring-zinc-600',
      outline: 'bg-transparent border border-zinc-600 text-zinc-300 hover:bg-zinc-800 focus:ring-zinc-500',
      link: 'bg-transparent text-blue-500 hover:underline hover:text-blue-400 p-0 h-auto focus:ring-0'
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles, 
          sizeStyles[size], 
          variantStyles[variant], 
          fullWidth && 'w-full',
          className
        )}
        disabled={props.disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={cn('animate-spin', children ? 'mr-2' : '', size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4')} />
        ) : leftIcon ? (
          <span className={cn('mr-2', size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm')}>{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isLoading && (
          <span className={cn('ml-2', size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm')}>{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
