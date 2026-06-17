import React from 'react';

const Card = React.forwardRef(({ className = '', variant = 'default', children, ...props }, ref) => {
 const baseStyles = 'rounded-[32px] overflow-hidden';
 
 const variants = {
 default: 'bg-white border-none smooth-shadow',
 elevated: 'bg-white backdrop-blur-xl border border-white smooth-shadow transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl',
 gradient: 'bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300 relative',
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
