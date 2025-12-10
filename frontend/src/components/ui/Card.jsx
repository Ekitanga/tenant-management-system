import React from 'react';
import { cn } from '../../utils/helpers';

const Card = ({ className, hover = false, children, ...props }) => {
  return (
    <div
      className={cn(
        'bg-white rounded-xl p-6 border border-gray-100 shadow-sm transition-all duration-200',
        hover && 'hover:shadow-lg hover:-translate-y-1 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ className, children, ...props }) => {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
      {children}
    </div>
  );
};

const CardTitle = ({ className, children, ...props }) => {
  return (
    <h3 className={cn('text-lg font-semibold text-gray-900', className)} {...props}>
      {children}
    </h3>
  );
};

const CardContent = ({ className, children, ...props }) => {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
};

export { Card, CardHeader, CardTitle, CardContent };
