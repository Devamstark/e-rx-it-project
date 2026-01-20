import React, { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    interactive?: boolean;
    flat?: boolean;
}

export const Card: React.FC<CardProps> = ({
    children,
    interactive = false,
    flat = false,
    className = "",
    ...props
}) => {
    return (
        <div
            className={`
                bg-[var(--color-surface-container-low)] 
                rounded-2xl 
                overflow-hidden
                ${flat ? 'border border-slate-200' : 'm3-card elevation-1'}
                ${interactive ? 'cursor-pointer hover:bg-[var(--color-surface-container)] hover:elevation-2 transition-all duration-200' : ''}
                ${className}
            `}
            {...props}
        >
            {children}
        </div>
    );
};

export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => (
    <div className={`px-6 py-4 border-b border-slate-100 ${className}`} {...props}>
        {children}
    </div>
);

export const CardContent: React.FC<HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => (
    <div className={`p-6 ${className}`} {...props}>
        {children}
    </div>
);

export const CardFooter: React.FC<HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => (
    <div className={`px-6 py-4 bg-[var(--color-surface-container)]/50 border-t border-slate-100 ${className}`} {...props}>
        {children}
    </div>
);
