
'use client'

import React from 'react';
import { cn } from '@/lib/utils';

interface SearchingIndicatorProps {
  partnerType: 'path' | 'resq' | 'cure';
  className?: string;
  showHeartbeat?: boolean;
}

const colorClasses = {
    path: 'text-primary', // Blue/Teal
    resq: 'text-amber-500', // Yellow/Orange
    cure: 'text-red-600', // Red
}

const SearchingIndicator: React.FC<SearchingIndicatorProps> = ({ partnerType, className, showHeartbeat = true }) => {
  const colorClass = colorClasses[partnerType];
  
  return (
    <div className={cn("relative w-24 h-24 mx-auto flex items-center justify-center", className)}>
      <div className="relative bg-transparent w-full h-full rounded-full flex items-center justify-center">
        <svg
          width="80%"
          height="80%"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={colorClass}
        >
          <defs>
            <style>
              {`
                @keyframes draw {
                  to {
                    stroke-dashoffset: 0;
                  }
                }
                 @keyframes pulse-heartbeat {
                  to {
                    stroke-dashoffset: 48;
                  }
                }
                .shield-border-animate {
                  stroke-dasharray: 60;
                  stroke-dashoffset: 60;
                  animation: draw 2.5s linear infinite;
                }
                .heartbeat-line-animate {
                    stroke-dasharray: 24;
                    stroke-dashoffset: 0;
                    animation: pulse-heartbeat 2s ease-in-out infinite;
                }
              `}
            </style>
          </defs>
          <path
            d="M12 2L3 5V11C3 16.5 6.8 21.7 12 23C17.2 21.7 21 16.5 21 11V5L12 2Z"
            fill="currentColor"
            style={{ opacity: 0.1 }}
          />
          <path
            d="M12 2L3 5V11C3 16.5 6.8 21.7 12 23C17.2 21.7 21 16.5 21 11V5L12 2Z"
            stroke="currentColor"
            strokeWidth="1"
            className="shield-border-animate"
            style={{ opacity: 0.3 }}
          />
          <path
            d="M5 12H8L10 14L14 10L16 12H19"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(showHeartbeat && "heartbeat-line-animate")}
          />
        </svg>
      </div>
    </div>
  );
};

export default SearchingIndicator;
