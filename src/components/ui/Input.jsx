import React from 'react';

const Input = React.forwardRef(({ 
  className = '', 
  label, 
  error, 
  hint, 
  icon, 
  id, 
  ...props 
}, ref) => {
  const inputId = id || React.useId();

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-slate-400 uppercase mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`
            w-full p-4 rounded-2xl font-bold text-lg text-slate-800 bg-slate-50 border-2
            focus:outline-none focus:ring-0 transition-colors
            ${icon ? 'pl-12' : ''}
            ${error 
              ? 'border-error/50 bg-red-50 focus:border-error' 
              : 'border-transparent focus:border-primary focus:bg-white'}
          `}
          {...props}
        />
      </div>
      {error && <p className="mt-2 text-sm text-error font-medium animate-slide-in-top">{error}</p>}
      {hint && !error && <p className="mt-2 text-sm text-slate-400">{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };
