import React from 'react';

interface FormFieldProps {
  label: string;
  children: React.ReactNode; // Changed to ReactNode to accept multiple elements
  fullWidth?: boolean;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ label, children, fullWidth = false, className = '' }) => {
    return (
        <div className={`${fullWidth ? 'md:col-span-2' : ''} ${className}`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}
            </label>
            <div className="mt-1">
                {children}
            </div>
        </div>
    );
};