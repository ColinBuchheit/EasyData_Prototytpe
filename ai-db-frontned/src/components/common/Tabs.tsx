// src/components/common/Tabs.tsx
import React, { createContext, useContext, useState } from 'react';
import { cn } from '../../utils/format.utils';

// Types
type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
  orientation: 'horizontal' | 'vertical';
};

// Context
const TabsContext = createContext<TabsContextValue | undefined>(undefined);

// Hook to use Tabs context
function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs component');
  }
  return context;
}

// Tabs component
interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  children: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  onValueChange,
  orientation = 'horizontal',
  className,
  children,
}) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange, orientation }}>
      <div className={cn('tabs', className)}>{children}</div>
    </TabsContext.Provider>
  );
};

// TabsList component
interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

export const TabsList: React.FC<TabsListProps> = ({ className, children }) => {
  const { orientation } = useTabsContext();
  
  return (
    <div
      className={cn(
        'tabs-list',
        orientation === 'horizontal' 
          ? 'flex space-x-1 rounded-xl bg-zinc-800 p-1' 
          : 'flex flex-col space-y-1 rounded-xl',
        className
      )}
    >
      {children}
    </div>
  );
};

// TabsTrigger component
interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  className,
  children,
}) => {
  const { value: selectedValue, onValueChange, orientation } = useTabsContext();
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      data-state={isSelected ? 'active' : 'inactive'}
      onClick={() => onValueChange(value)}
      className={cn(
        'tabs-trigger flex items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all',
        orientation === 'horizontal' ? 'justify-center' : 'justify-start',
        isSelected
          ? 'bg-zinc-950 text-zinc-100 shadow-sm'
          : 'text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-100',
        className
      )}
    >
      {children}
    </button>
  );
};

// TabsContent component
interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  className,
  children,
}) => {
  const { value: selectedValue } = useTabsContext();
  const isSelected = selectedValue === value;

  if (!isSelected) return null;

  return (
    <div
      role="tabpanel"
      data-state={isSelected ? 'active' : 'inactive'}
      className={cn('tabs-content mt-2', className)}
    >
      {children}
    </div>
  );
};