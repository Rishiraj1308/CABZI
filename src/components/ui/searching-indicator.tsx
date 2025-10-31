
'use client'

import React from 'react';
import { cn } from '@/lib/utils';
import { Car, Wrench, Ambulance } from 'lucide-react';

interface SearchingIndicatorProps {
  partnerType: 'path' | 'resq' | 'cure';
  className?: string;
}

const colorClasses = {
    path: 'text-primary', // Blue/Teal
    resq: 'text-amber-500', // Yellow/Orange
    cure: 'text-red-600', // Red
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
    <div className={cn("relative w-24 h-24 mx-auto flex items-center justify-center", className)}>
      <div className={cn('absolute w-full h-full rounded-full animate-pulse', colorClass)} style={{ backgroundColor: 'currentColor', opacity: 0.1, animationDuration: '2s' }}></div>
      <div className={cn('absolute w-2/3 h-2/3 rounded-full animate-pulse', colorClass)} style={{ backgroundColor: 'currentColor', opacity: 0.2, animationDuration: '2s', animationDelay: '0.5s' }}></div>
      <Icon className={cn("w-1/2 h-1/2 absolute", colorClass)} />
    </div>
  );
};

export default SearchingIndicator;
