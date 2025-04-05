import { Toaster } from 'react-hot-toast';

const Toast = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#18181b', // Tailwind: zinc-900
          color: '#f4f4f5',      // Tailwind: zinc-100
          border: '1px solid #3f3f46', // Tailwind: zinc-700
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
      }}
    />
  );
};

export default Toast;
