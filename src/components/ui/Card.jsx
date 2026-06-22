import React from 'react';

const Card = React.forwardRef(({ className = '', variant = 'default', children, ...props }, ref) => {
 const baseStyles = 'rounded-[32px] overflow-hidden';
 
 const variants = {
 default: 'bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
 elevated: 'bg-white border border-indigo-50 shadow-[0_10px_40px_rgba(79,70,229,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(79,70,229,0.12)]',
 gradient: 'bg-gradient-to-br from-indigo-50/60 via-white to-fuchsia-50/40 text-slate-900 border border-indigo-100/50 shadow-[0_8px_30px_rgba(79,70,229,0.05)] hover:-translate-y-1 transition-all duration-300 relative',
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
