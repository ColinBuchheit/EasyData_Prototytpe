import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { cn } from '../../utils/format.utils';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnClickOutside?: boolean;
  showCloseButton?: boolean;
  contentClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnClickOutside = true,
  showCloseButton = true,
  contentClassName,
}) => {
  // Size variants
  const sizeVariants = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4'
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={closeOnClickOutside ? onClose : () => {}}
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal */}
        <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="scale-95 opacity-0"
            enterTo="scale-100 opacity-100"
            leave="ease-in duration-200"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-95 opacity-0"
          >
            <Dialog.Panel 
              className={cn(
                "w-full transform overflow-hidden rounded-lg bg-zinc-900 shadow-xl transition-all", 
                sizeVariants[size],
                contentClassName
              )}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                  <div>
                    {title && (
                      <Dialog.Title className="text-lg font-semibold text-zinc-100">
                        {title}
                      </Dialog.Title>
                    )}
                    {description && (
                      <Dialog.Description className="mt-1 text-sm text-zinc-400">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                  {showCloseButton && (
                    <button 
                      onClick={onClose} 
                      className="text-zinc-400 hover:text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md" 
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
              
              {/* Content */}
              <div className={cn("p-4", !title && !showCloseButton && "pt-6")}>
                {children}
              </div>
              
              {/* Footer */}
              {footer && (
                <div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-800 bg-zinc-950">
                  {footer}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

// Standard footer actions
export const ModalFooter: React.FC<{
  onCancel?: () => void;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  danger?: boolean;
  isConfirmLoading?: boolean;
  isConfirmDisabled?: boolean;
}> = ({
  onCancel,
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Confirm",
  danger = false,
  isConfirmLoading = false,
  isConfirmDisabled = false,
}) => (
  <>
    {onCancel && (
      <Button variant="ghost" onClick={onCancel}>
        {cancelText}
      </Button>
    )}
    <Button
      variant={danger ? "danger" : "default"}
      onClick={onConfirm}
      isLoading={isConfirmLoading}
      disabled={isConfirmDisabled}
    >
      {confirmText}
    </Button>
  </>
);

export default Modal;
