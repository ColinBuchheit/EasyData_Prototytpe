import React, { forwardRef } from 'react';
import { cn } from '../../utils/format.utils';
import { Info, AlertCircle } from 'lucide-react';

// Omit the native 'size' property to avoid conflict with our custom size prop
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    hint,
    leftIcon,
    rightIcon,
    size = 'md',
    fullWidth = true,
    className,
    containerClassName,
    ...props 
  }, ref) => {
    // Sizing styles
    const sizeStyles = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-3 text-base'
    };

    // Id for associating label with input
    const id = props.id || `input-${Math.random().toString(36).substring(2, 9)}`;

    return (
      <div className={cn("space-y-1", fullWidth ? "w-full" : "", containerClassName)}>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-zinc-300">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
              {leftIcon}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            className={cn(
              'rounded-md bg-zinc-800 text-zinc-100 border transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              error ? 'border-red-500' : 'border-zinc-700 hover:border-zinc-600',
              sizeStyles[size],
              leftIcon ? 'pl-10' : '',
              rightIcon ? 'pr-10' : '',
              fullWidth ? 'w-full' : '',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-500">
              {rightIcon}
            </div>
          )}
          {error && !rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-red-500">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}
        </div>
        {error && (
          <p id={`${id}-error`} className="text-sm text-red-500 flex items-center gap-1">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${id}-hint`} className="text-sm text-zinc-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
