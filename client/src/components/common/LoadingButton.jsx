import React from 'react';
import { ButtonLoader } from './Loader';

/**
 * LoadingButton - A button that shows a spinner when loading
 * @param {object} props
 * @param {boolean} props.loading - Whether to show the spinner
 * @param {string} [props.className] - Additional classes
 * @param {React.ReactNode} props.children - Button content
 * @param {string} [props.type] - Button type
 * @param {boolean} [props.disabled] - Disabled state
 * @param {function} [props.onClick] - Click handler
 */
const LoadingButton = ({
  loading = false,
  className = '',
  children,
  type = 'button',
  disabled = false,
  onClick,
  ...rest
}) => {
  return (
    <button
      type={type}
      className={`relative flex items-center justify-center ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading && (
        <span className="absolute left-4">
          <ButtonLoader size="md" />
        </span>
      )}
      <span className={loading ? 'opacity-60 ml-4' : ''}>{children}</span>
    </button>
  );
};

export default LoadingButton;
