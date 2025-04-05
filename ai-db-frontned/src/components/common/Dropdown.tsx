import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/format.utils';

export interface DropdownItem {
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface DropdownProps {
  triggerLabel: string;
  items: DropdownItem[];
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ triggerLabel, items, className }) => {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-zinc-800 text-zinc-100 rounded-md hover:bg-zinc-700 focus:outline-none',
          className
        )}
      >
        {triggerLabel}
        <ChevronDown className="w-4 h-4" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        className="z-50 min-w-[160px] rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-lg"
        sideOffset={6}
      >
        {items.map((item, i) => (
          <DropdownMenu.Item
            key={i}
            disabled={item.disabled}
            onSelect={item.onSelect}
            className={cn(
              'cursor-pointer select-none rounded px-3 py-2 text-sm text-zinc-100 outline-none transition-colors',
              'hover:bg-zinc-800 focus:bg-zinc-800',
              item.disabled && 'opacity-50 pointer-events-none'
            )}
          >
            <div className="flex items-center gap-2">
              {item.icon}
              <span>{item.label}</span>
            </div>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default Dropdown;
