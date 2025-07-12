import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'md',
    className = '',
}) => {
    const getVariantStyles = (variant: string) => {
        switch (variant) {
            case 'default':
                return 'bg-gray-100 text-gray-800';
            case 'primary':
                return 'bg-blue-100 text-blue-800';
            case 'secondary':
                return 'bg-gray-100 text-gray-600';
            case 'success':
                return 'bg-green-100 text-green-800';
            case 'warning':
                return 'bg-yellow-100 text-yellow-800';
            case 'danger':
                return 'bg-red-100 text-red-800';
            case 'info':
                return 'bg-cyan-100 text-cyan-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getSizeStyles = (size: string) => {
        switch (size) {
            case 'sm':
                return 'px-2 py-0.5 text-xs';
            case 'md':
                return 'px-2.5 py-1 text-sm';
            case 'lg':
                return 'px-3 py-1.5 text-base';
            default:
                return 'px-2.5 py-1 text-sm';
        }
    };

    const baseStyles = 'inline-flex items-center rounded-full font-medium';

    const badgeStyles = `
    ${baseStyles}
    ${getVariantStyles(variant)}
    ${getSizeStyles(size)}
    ${className}
  `.trim();

    return (
        <span className={badgeStyles}>
            {children}
        </span>
    );
}; 