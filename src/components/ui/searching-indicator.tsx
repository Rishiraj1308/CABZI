
'use client';

import React from 'react';
import Lottie from 'lottie-react';
import animationData from './lottie-finding-driver.json';
import { cn } from '@/lib/utils';
import { Car, Wrench, Ambulance } from 'lucide-react';

interface SearchingIndicatorProps {
  partnerType: 'path' | 'resq' | 'cure';
  className?: string;
}

const colorClasses = {
    path: 'text-primary',
    resq: 'text-amber-500',
    cure: 'text-red-600',
}

const icons = {
    path: Car,
    resq: Wrench,
    cure: Ambulance,
}

const SearchingIndicator: React.FC<SearchingIndicatorProps> = ({ partnerType, className }) => {
    const colorClass = colorClasses[partnerType];
    const Icon = icons[partnerType];
    
    return (
        <div className={cn("relative w-48 h-48 mx-auto flex items-center justify-center", className)}>
            <Lottie 
                animationData={animationData} 
                className="absolute inset-0 w-full h-full"
            />
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center bg-background shadow-inner", colorClass)}>
                 <Icon className="w-8 h-8" />
            </div>
        </div>
    );
};

export default SearchingIndicator;
