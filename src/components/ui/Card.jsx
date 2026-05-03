import React from 'react';

const Card = React.forwardRef(({ className = '', variant = 'default', children, ...props }, ref) => {
  const baseStyles = 'rounded-[32px] overflow-hidden';
  
  const variants = {
    default: 'bg-white border border-slate-100 shadow-sm',
    elevated: 'bg-white border border-slate-100 shadow-lg hover:shadow-xl transition-shadow duration-300',
    gradient: 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg',
    outline: 'bg-transparent border-2 border-slate-200',
    ghost: 'bg-transparent',
  };

  return (
    <div
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export { Card };
