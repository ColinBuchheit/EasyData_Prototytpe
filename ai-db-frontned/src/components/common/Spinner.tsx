import React from 'react';
import { cn } from '../../utils/format.utils';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white';
  className?: string;
  thickness?: 'thin' | 'regular' | 'thick';
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className = '',
  thickness = 'regular',
}) => {
  // Size mapping
  const sizeMap = {
    xs: 12,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48
  };

  // Variant colors
  const variantColors = {
    primary: 'text-blue-500',
    secondary: 'text-zinc-500',
    white: 'text-white'
  };

  // Thickness
  const thicknessMap = {
    thin: 'stroke-1',
    regular: 'stroke-2',
    thick: 'stroke-[3px]'
  };

  return (
    <Loader2
      className={cn(
        'animate-spin',
        variantColors[variant],
        thicknessMap[thickness],
        className
      )}
      style={{ 
        width: sizeMap[size], 
        height: sizeMap[size] 
      }}
      aria-label="Loading"
    />
  );
};

export default Spinner;
