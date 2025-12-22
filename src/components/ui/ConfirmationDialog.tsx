import React from 'react';
import { BaseModal } from './BaseModal'; // <--- Updated import
import { Button } from './Button';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
}) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {message}
        </p>
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'danger' : 'primary'} 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};