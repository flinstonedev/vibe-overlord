import React from 'react';

interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    disabled = false,
    className = '',
    type = 'button',
}) => {
    const getVariantStyles = (variant: string) => {
        switch (variant) {
            case 'primary':
                return 'bg-blue-600 hover:bg-blue-700 text-white';
            case 'secondary':
                return 'bg-gray-600 hover:bg-gray-700 text-white';
            case 'danger':
                return 'bg-red-600 hover:bg-red-700 text-white';
            case 'success':
                return 'bg-green-600 hover:bg-green-700 text-white';
            case 'outline':
                return 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white bg-transparent';
            default:
                return 'bg-blue-600 hover:bg-blue-700 text-white';
        }
    };

    const getSizeStyles = (size: string) => {
        switch (size) {
            case 'sm':
                return 'px-3 py-1.5 text-sm';
            case 'md':
                return 'px-4 py-2 text-base';
            case 'lg':
                return 'px-6 py-3 text-lg';
            default:
                return 'px-4 py-2 text-base';
        }
    };

    const baseStyles = 'rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
    const disabledStyles = 'opacity-50 cursor-not-allowed';

    const buttonStyles = `
    ${baseStyles}
    ${getVariantStyles(variant)}
    ${getSizeStyles(size)}
    ${disabled ? disabledStyles : ''}
    ${className}
  `.trim();

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={buttonStyles}
        >
            {children}
        </button>
    );
}; 