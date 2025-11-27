



import React, { useId } from 'react';

interface FormFieldProps {
  label: string;
  children: React.ReactElement; // Expect a single child
  fullWidth?: boolean;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ label, children, fullWidth = false, className = '' }) => {
    const id = useId();
    const child = React.Children.only(children);

    return (
        <div className={`${fullWidth ? 'md:col-span-2' : ''} ${className}`}>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
            </label>
            <div className="mt-1">
                {/* FIX: Removed spread of child.props to resolve TS inference issues. cloneElement merges props automatically. */}
                {React.cloneElement(child, { id })}
            </div>
        </div>
    );
};
