import React from 'react';
import { cn } from '../../utils/format.utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  footer?: React.ReactNode;
  onClick?: () => void;
  hoverable?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  title,
  footer,
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      className={cn(
        'bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-md',
        hoverable && 'hover:border-zinc-700 transition-colors cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {title && (
        <div className="px-4 py-3 border-b border-zinc-800">
          <h3 className="text-lg font-medium text-zinc-100">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
      {footer && (
        <div className="px-4 py-3 bg-zinc-950 border-t border-zinc-800">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
