import React, { ReactNode } from 'react';
import toast, { Toaster, Toast as HotToast, ToastOptions } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../utils/format.utils';

export type ToastPosition = 
  | 'top-left' 
  | 'top-center' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-center' 
  | 'bottom-right';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  position?: ToastPosition;
  reverseOrder?: boolean;
  gutter?: number;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  toastOptions?: ToastOptions;
}

interface CustomToastOptions extends Omit<ToastOptions, 'icon'> {
  icon?: ReactNode;
  description?: string;
}

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />
};

// Component to render inside toast
const ToastContent = ({
  title,
  description,
  icon,
  type,
  onClose
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  type: ToastType;
  onClose?: () => void;
}) => (
  <div className="flex items-start gap-2">
    <div className="shrink-0 pt-0.5">
      {icon !== undefined ? icon : icons[type]}
    </div>
    <div className="flex-1 mr-2">
      <p className="font-medium text-zinc-100">{title}</p>
      {description && <p className="text-sm text-zinc-400">{description}</p>}
    </div>
    {onClose && (
      <button 
        onClick={onClose} 
        className="shrink-0 rounded-full p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 focus:outline-none" 
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

const Toast: React.FC<ToastProps> = ({
  position = 'top-right',
  reverseOrder = false,
  gutter = 8,
  containerClassName,
  containerStyle,
  toastOptions = {}
}) => {
  return (
    <Toaster
      position={position}
      reverseOrder={reverseOrder}
      gutter={gutter}
      containerClassName={containerClassName}
      containerStyle={containerStyle}
      toastOptions={{
        duration: 4000,
        style: {
          background: '#18181b', // Tailwind: zinc-900
          color: '#f4f4f5',      // Tailwind: zinc-100
          border: '1px solid #3f3f46', // Tailwind: zinc-700
          padding: '12px',
          borderRadius: '6px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // Tailwind shadow-lg
        },
        success: {
          iconTheme: {
            primary: '#10b981', // emerald-500
            secondary: '#ecfdf5',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444', // red-500
            secondary: '#fef2f2',
          },
        },
        ...toastOptions
      }}
    />
  );
};

// Helper functions to create toasts
export const showToast = {
  success: (title: string, options?: CustomToastOptions) => {
    const { icon, description, ...restOptions } = options || {};
    return toast.custom((t) => (
      <ToastContent
        title={title}
        description={description}
        icon={icon}
        type="success"
        onClose={() => toast.dismiss(t.id)}
      />
    ), restOptions);
  },
  error: (title: string, options?: CustomToastOptions) => {
    const { icon, description, ...restOptions } = options || {};
    return toast.custom((t) => (
      <ToastContent
        title={title}
        description={description}
        icon={icon}
        type="error"
        onClose={() => toast.dismiss(t.id)}
      />
    ), { duration: 5000, ...restOptions });
  },
  warning: (title: string, options?: CustomToastOptions) => {
    const { icon, description, ...restOptions } = options || {};
    return toast.custom((t) => (
      <ToastContent
        title={title}
        description={description}
        icon={icon}
        type="warning"
        onClose={() => toast.dismiss(t.id)}
      />
    ), restOptions);
  },
  info: (title: string, options?: CustomToastOptions) => {
    const { icon, description, ...restOptions } = options || {};
    return toast.custom((t) => (
      <ToastContent
        title={title}
        description={description}
        icon={icon}
        type="info"
        onClose={() => toast.dismiss(t.id)}
      />
    ), restOptions);
  },
  custom: (content: React.ReactNode | ((t: HotToast) => React.ReactElement), options?: ToastOptions) => {
    // Handle the content appropriately based on its type
    if (typeof content === 'function') {
      return toast.custom(content as any, options);
    } else {
      // If it's a React element, wrap it in a function
      return toast.custom(() => content as React.ReactElement, options);
    }
  },
  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },
  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    },
    options?: ToastOptions
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    }, options);
  },
};

export default Toast;
