import React from 'react';

const Badge = ({ className = '', variant = 'default', children, ...props }) => {
  const baseStyles = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase';
  
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-primary-light text-primary-dark',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    dark: 'bg-neutral-800 text-white',
    outline: 'border border-slate-200 text-slate-600',
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export { Badge };
