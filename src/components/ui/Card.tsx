
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
  edgeColor?: 'orange' | 'blue' | 'purple' | 'green' | 'red'; // AI Edge Bar color
  depth?: boolean; // Enable 3D transform
  variant?: 'solid' | 'glass'; // New Prop
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  title, 
  actions, 
  noPadding = false, 
  edgeColor,
  depth = false,
  variant = 'solid', // Default to solid for functional pages
  ...props 
}) => {
  
  const edgeColorClass = {
    orange: 'from-neon-orange to-orange-600',
    blue: 'from-neon-blue to-blue-600',
    purple: 'from-neon-purple to-purple-600',
    green: 'from-neon-green to-emerald-600',
    red: 'from-neon-pink to-red-600',
  };

  // Determine base class based on variant
  const cardBaseClass = variant === 'glass' ? 'evirosafe-card-glass' : 'evirosafe-card-solid';

  return (
    <div 
      className={`${cardBaseClass} relative overflow-hidden group ${depth ? 'hover:-translate-y-1' : ''} ${className}`} 
      style={depth ? { transition: 'transform 0.3s ease, box-shadow 0.3s ease', transform: 'translateZ(12px)' } : {}}
      {...props}
    >
      {/* AI Edge Bar */}
      {edgeColor && (
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${edgeColorClass[edgeColor]} shadow-[0_0_15px_currentColor] opacity-80 group-hover:opacity-100 transition-opacity`}></div>
      )}
      
      {/* Subtle Inner Border for Depth (Glass only) */}
      {variant === 'glass' && (
        <div className="absolute inset-0 rounded-[24px] border border-white/5 pointer-events-none"></div>
      )}

      {(title || actions) && (
        <div className={`px-6 py-4 border-b ${variant === 'glass' ? 'border-white/10' : 'border-[#1f2937]'} flex justify-between items-center ${edgeColor ? 'pl-8' : ''} ${variant === 'glass' ? 'bg-gradient-to-r from-white/5 to-transparent' : 'bg-[#0f172a]'}`}>
          {title && <h3 className="text-lg font-bold tracking-tight text-text-primary dark:text-white drop-shadow-sm">{title}</h3>}
          {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
      )}
      <div className={`${noPadding ? '' : 'p-6'} ${edgeColor ? 'pl-8' : ''} relative z-10`}>
        {children}
      </div>
    </div>
  );
};
