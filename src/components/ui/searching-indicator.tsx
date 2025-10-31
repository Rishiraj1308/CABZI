
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Car, Wrench, Ambulance } from 'lucide-react';

interface SearchingIndicatorProps {
  partnerType: 'path' | 'resq' | 'cure';
  className?: string;
}

const colorClasses = {
    path: {
        ring: 'stroke-primary',
        icon: 'text-primary',
    },
    resq: {
        ring: 'stroke-amber-500',
        icon: 'text-amber-600',
    },
    cure: {
        ring: 'stroke-red-600',
        icon: 'text-red-600',
    },
}

const icons = {
    path: Car,
    resq: Wrench,
    cure: Ambulance,
}

const SearchingIndicator: React.FC<SearchingIndicatorProps> = ({ partnerType, className }) => {
    const colors = colorClasses[partnerType];
    const Icon = icons[partnerType];
    
    return (
        <div className={cn("relative w-48 h-48 mx-auto flex items-center justify-center", className)}>
            <style>
                {`
                    @keyframes pulse-ring {
                        0% {
                            transform: scale(0.33);
                            opacity: 1;
                        }
                        80%, 100% {
                            transform: scale(1);
                            opacity: 0;
                        }
                    }
                `}
            </style>
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                <circle
                    className={cn("origin-center", colors.ring)}
                    cx="50"
                    cy="50"
                    r="45"
                    strokeWidth="2"
                    fill="none"
                    style={{ animation: 'pulse-ring 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite' }}
                />
                <circle
                    className={cn("origin-center", colors.ring)}
                    cx="50"
                    cy="50"
                    r="45"
                    strokeWidth="2"
                    fill="none"
                    style={{ animation: 'pulse-ring 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite', animationDelay: '1s' }}
                />
                 <circle
                    className={cn("origin-center", colors.ring)}
                    cx="50"
                    cy="50"
                    r="45"
                    strokeWidth="2"
                    fill="none"
                    style={{ animation: 'pulse-ring 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite', animationDelay: '2s' }}
                />
            </svg>
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center bg-background shadow-md", colors.icon)}>
                 <Icon className="w-10 h-10" />
            </div>
        </div>
    );
};

export default SearchingIndicator;
