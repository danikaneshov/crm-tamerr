import React from 'react';

const Card = React.forwardRef(({ className = '', variant = 'default', children, ...props }, ref) => {
 const baseStyles = 'rounded-[32px] overflow-hidden';
 
 const variants = {
 default: 'bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
 elevated: 'bg-white backdrop-blur-xl border border-white smooth-shadow transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl',
 gradient: 'bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-900 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 relative',
 outline: 'bg-transparent border-2 border-slate-200 ',
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
