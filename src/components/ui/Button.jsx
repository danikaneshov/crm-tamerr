import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = React.forwardRef(({ 
  className = '', 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  leftIcon, 
  rightIcon, 
  children, 
  disabled, 
  ...props 
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 rounded-2xl';
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark shadow-md hover:shadow-lg focus:ring-primary-light',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-200',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-200',
    outline: 'border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-200',
    gradient: 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md hover:shadow-lg hover:from-primary-dark hover:to-primary-dark focus:ring-primary-light',
    danger: 'bg-error text-white hover:bg-red-600 shadow-md hover:shadow-lg focus:ring-red-200',
    dark: 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-md hover:shadow-lg focus:ring-neutral-200',
  };

  const sizes = {
    xs: 'px-3 py-1.5 text-xs',
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';

export { Button };
