import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color: 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple' | 'indigo';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, color, size = 'md' }) => {
    const baseClasses = 'inline-flex items-center font-bold rounded-full border backdrop-blur-md shadow-sm';

    const colorClasses = {
        green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10',
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/10',
        yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10',
        red: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/10',
        gray: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-purple-500/10',
        indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-indigo-500/10',
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-3 py-1 text-xs', 
    };

    return (
        <span className={`${baseClasses} ${colorClasses[color]} ${sizeClasses[size]}`}>
            {children}
        </span>
    );
}