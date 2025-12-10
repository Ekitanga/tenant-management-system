import React from 'react';
import { cn } from '../../utils/helpers';

const Input = React.forwardRef(({
  className,
  type = 'text',
  label,
  error,
  helperText,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {props.required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={cn(
          'w-full px-4 py-3 rounded-lg border transition-all duration-200',
          'focus:outline-none focus:ring-4',
          'disabled:bg-gray-50 disabled:cursor-not-allowed',
          error
            ? 'border-red-600 focus:border-red-600 focus:ring-red-600/10'
            : 'border-gray-200 focus:border-blue-600 focus:ring-blue-600/10',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
