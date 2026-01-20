import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    leftIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    className = '',
    children,
    disabled,
    ...props
}) => {

    // Base Styles
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

    // Rounded - M3 uses full rounded buttons usually, or slightly rounded (12px)
    const rounded = "rounded-full";

    // Variants
    const variants = {
        primary: "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:opacity-90 shadow-md hover:shadow-lg hover:shadow-[var(--color-primary)]/30 border border-transparent",
        secondary: "bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] hover:bg-[var(--color-secondary-container)]/80 border border-transparent",
        outline: "bg-transparent border border-[var(--color-outline, #cbd5e1)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]",
        ghost: "bg-transparent text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]",
        danger: "bg-[var(--color-error)] text-[var(--color-on-error)] hover:opacity-90 shadow-sm"
    };

    // Sizes
    const sizes = {
        sm: "text-xs px-3 py-1.5 h-8",
        md: "text-sm px-5 py-2.5 h-10",
        lg: "text-base px-6 py-3 h-12"
    };

    return (
        <button
            className={`${baseStyles} ${rounded} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
        </button>
    );
};
