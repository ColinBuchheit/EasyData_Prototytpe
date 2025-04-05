import React from 'react';
import { Loader2 } from 'lucide-react';

const Spinner: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = '',
}) => (
  <Loader2
    className={`animate-spin text-blue-500 ${className}`}
    style={{ width: size, height: size }}
  />
);

export default Spinner;
