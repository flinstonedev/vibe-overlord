import React from 'react';

interface CardProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    footer?: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    shadow?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
    children,
    title,
    subtitle,
    footer,
    className = '',
    padding = 'md',
    shadow = 'md',
}) => {
    const getPaddingStyles = (padding: string) => {
        switch (padding) {
            case 'none':
                return '';
            case 'sm':
                return 'p-3';
            case 'md':
                return 'p-4';
            case 'lg':
                return 'p-6';
            default:
                return 'p-4';
        }
    };

    const getShadowStyles = (shadow: string) => {
        switch (shadow) {
            case 'none':
                return '';
            case 'sm':
                return 'shadow-sm';
            case 'md':
                return 'shadow-md';
            case 'lg':
                return 'shadow-lg';
            default:
                return 'shadow-md';
        }
    };

    const cardStyles = `
    bg-white rounded-lg border border-gray-200 ${getShadowStyles(shadow)} ${className}
  `.trim();

    const contentStyles = getPaddingStyles(padding);

    return (
        <div className={cardStyles}>
            {(title || subtitle) && (
                <div className={`border-b border-gray-200 ${padding === 'none' ? 'p-4' : getPaddingStyles(padding)}`}>
                    {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
                    {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
                </div>
            )}

            <div className={contentStyles}>
                {children}
            </div>

            {footer && (
                <div className={`border-t border-gray-200 ${padding === 'none' ? 'p-4' : getPaddingStyles(padding)}`}>
                    {footer}
                </div>
            )}
        </div>
    );
}; 