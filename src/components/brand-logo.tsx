
'use client'

import { cn } from '@/lib/utils'
import SearchingIndicator from './ui/searching-indicator';

interface BrandLogoProps {
  className?: string;
  iconClassName?: string;
  hideText?: boolean;
}


// The NewLogoIcon remains as it is for the splash screen
const NewLogoIcon = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn("w-36 h-36", className)}
      style={{ perspective: '1000px' }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: 'rotateY(-15deg) rotateX(15deg)' }}
      >
        <defs>
          <clipPath id="circle-clip">
            <circle cx="50" cy="50" r="42" />
          </clipPath>
           <style>
            {`
              @keyframes rotate-tire {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes pulse-heartbeat {
                to {
                  stroke-dashoffset: 48;
                }
              }
              .tire-tread-group {
                animation: rotate-tire 30s linear infinite;
                transform-origin: center;
                filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.2)) drop-shadow(5px 5px 5px rgba(0,0,0,0.1));
              }
              .heartbeat-line-animate {
                  stroke-dasharray: 24;
                  stroke-dashoffset: 0;
                  animation: pulse-heartbeat 2s ease-in-out infinite;
                  filter: drop-shadow(0 0 3px hsl(var(--primary) / 0.7));
              }
              .shield-path {
                 filter: drop-shadow(3px 3px 3px rgba(0,0,0,0.25)) drop-shadow(8px 8px 8px rgba(0,0,0,0.15));
              }
            `}
          </style>
          <radialGradient id="glossy-gradient" cx="50%" cy="40%" r="60%" fx="50%" fy="40%">
            <stop offset="0%" style={{ stopColor: 'hsl(var(--background))', stopOpacity: '0.5' }} />
            <stop offset="100%" style={{ stopColor: 'hsl(var(--background))', stopOpacity: '0' }} />
          </radialGradient>
        </defs>

        {/* <!-- Tire Tread Ring --> */}
        <g className="tire-tread-group">
          {[...Array(60)].map((_, i) => (
            <line
              key={i}
              x1="50"
              y1="2"
              x2="50"
              y2="12"
              stroke="hsl(var(--foreground))"
              strokeWidth="1.5"
              strokeOpacity="0.5"
              transform={`rotate(${i * 6}, 50, 50)`}
            />
          ))}
        </g>
        
        {/* <!-- Inner Shield --> */}
        <g className="shield-path">
          <path
            d="M50 12 L18 25 V50 C18 70 45 88 50 90 C55 88 82 70 82 50 V25 Z"
            fill="hsl(var(--background))"
            stroke="hsl(var(--foreground))"
            strokeWidth="3"
          />
           <path
            d="M50 12 L18 25 V50 C18 70 45 88 50 90 C55 88 82 70 82 50 V25 Z"
            fill="url(#glossy-gradient)"
          />
        </g>
        
        {/* <!-- Heartbeat Line --> */}
        <path
          d="M30 52 H40 L45 47 L55 57 L60 52 H70"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="heartbeat-line-animate"
        />
      </svg>
    </div>
  );
};


export default function BrandLogo({ className, iconClassName, hideText = false }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center select-none", className)}>
        <NewLogoIcon className={cn("w-10 h-10", iconClassName)} />
       {!hideText && <span className="text-xl ml-2 font-extrabold tracking-tight animate-text-gradient bg-gradient-to-r from-primary via-accent to-primary font-headline">Cabzi</span>}
    </div>
  )
}

export { NewLogoIcon };
