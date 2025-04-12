import React, { forwardRef } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/format.utils';

export interface DropdownItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  description?: string;
}

interface DropdownProps {
  triggerLabel?: string;
  triggerIcon?: React.ReactNode;
  items: DropdownItem[];
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end';
  fullWidth?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const Dropdown = forwardRef<HTMLButtonElement, DropdownProps>(
  ({
    triggerLabel,
    triggerIcon,
    items,
    className,
    variant = 'default',
    size = 'md',
    align = 'end',
    fullWidth = false,
    value,
    onChange,
    disabled = false,
    placeholder = 'Select option...',
  }, ref) => {
    // Selected item
    const selectedItem = items.find(item => item.value === value);
    const displayLabel = selectedItem?.label || triggerLabel || placeholder;

    // Variant styles
    const variantStyles = {
      default: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
      outline: 'border border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-100',
      ghost: 'bg-transparent hover:bg-zinc-800 text-zinc-100'
    };

    // Size styles
    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5',
      md: 'text-sm px-3 py-2',
      lg: 'text-base px-4 py-2.5'
    };

    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          ref={ref}
          disabled={disabled}
          className={cn(
            'inline-flex items-center justify-between gap-2 rounded-md font-medium transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            variantStyles[variant],
            sizeStyles[size],
            disabled && 'opacity-50 pointer-events-none',
            fullWidth && 'w-full',
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {triggerIcon && <span className="text-zinc-400">{triggerIcon}</span>}
            {displayLabel}
          </span>
          <ChevronDown className={cn("opacity-70", size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4')} />
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align={align}
            className="z-50 min-w-[180px] overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-lg"
            sideOffset={6}
          >
            {items.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-zinc-500 text-center">
                No items available
              </div>
            ) : (
              items.map((item) => (
                <DropdownMenu.Item
                  key={item.value}
                  disabled={item.disabled}
                  onSelect={() => onChange?.(item.value)}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center rounded px-2.5 py-1.5 text-sm text-zinc-100 outline-none transition-colors',
                    'hover:bg-zinc-800 focus:bg-zinc-800',
                    item.disabled && 'opacity-50 pointer-events-none',
                    item.value === value && 'bg-zinc-800'
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.icon && <span className="text-zinc-400">{item.icon}</span>}
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.value === value && <Check className="h-4 w-4 text-blue-500" />}
                  </div>
                  {item.description && (
                    <div className="mt-0.5 w-full text-xs text-zinc-500">
                      {item.description}
                    </div>
                  )}
                </DropdownMenu.Item>
              ))
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  }
);

Dropdown.displayName = 'Dropdown';

export default Dropdown;
