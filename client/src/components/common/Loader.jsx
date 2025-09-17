// src/components/common/Loader.jsx
import React from 'react';

const Loader = ({ 
  size = 'md', 
  color = 'primary', 
  text = '', 
  fullScreen = false,
  overlay = false 
}) => {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    primary: 'border-primary-600',
    white: 'border-white',
    gray: 'border-gray-600',
    success: 'border-green-600',
    warning: 'border-yellow-600',
    danger: 'border-red-600'
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const spinner = (
    <div className="flex flex-col items-center space-y-3">
      <div
        className={`${sizeClasses[size]} border-2 border-gray-200 dark:border-gray-700 rounded-full animate-spin`}
        style={{
          borderTopColor: color === 'primary' ? '#2563eb' : 
                          color === 'white' ? '#ffffff' :
                          color === 'gray' ? '#6b7280' :
                          color === 'success' ? '#10b981' :
                          color === 'warning' ? '#f59e0b' :
                          color === 'danger' ? '#ef4444' : '#2563eb'
        }}
      />
      {text && (
        <p className={`${textSizeClasses[size]} text-gray-600 dark:text-gray-400 font-medium`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-40">
        {spinner}
      </div>
    );
  }

  return spinner;
};

// Skeleton loader for content placeholders
export const SkeletonLoader = ({ lines = 3, className = '' }) => {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

// Card skeleton loader
export const CardSkeleton = ({ className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
      </div>
      <div className="mt-4 flex justify-between">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      </div>
    </div>
  );
};

// List skeleton loader
export const ListSkeleton = ({ items = 5, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
};

// Button loader
export const ButtonLoader = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div
      className={`${sizeClasses[size]} border-2 border-current border-r-transparent rounded-full animate-spin ${className}`}
    />
  );
};

// Dots loader
export const DotsLoader = ({ size = 'md', color = 'primary' }) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  const colorClasses = {
    primary: 'bg-primary-600',
    white: 'bg-white',
    gray: 'bg-gray-600'
  };

  return (
    <div className="flex space-x-1">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`}
          style={{ animationDelay: `${index * 0.1}s` }}
        />
      ))}
    </div>
  );
};

// Progress bar loader
export const ProgressLoader = ({ progress = 0, className = '' }) => {
  return (
    <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 ${className}`}>
      <div
        className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
};

// Chart skeleton loader
export const ChartSkeleton = ({ bars = 5, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {[...Array(bars)].map((_, i) => (
        <div
          key={i}
          className="bg-gray-200 dark:bg-gray-700 rounded h-4 animate-pulse"
          style={{ width: `${Math.random() * 60 + 40}%` }} // Random width between 40%–100%
        />
      ))}
    </div>
  );
};


export default Loader;