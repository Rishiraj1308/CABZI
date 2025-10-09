
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
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-36 h-36", className)}
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
              0% { stroke-width: 2; opacity: 0.9; }
              50% { stroke-width: 3; opacity: 1; }
              100% { stroke-width: 2; opacity: 0.9; }
            }
            .tire-tread {
              animation: rotate-tire 30s linear infinite;
              transform-origin: center;
            }
            .heartbeat-line {
              animation: pulse-heartbeat 1.5s ease-in-out infinite;
            }
          `}
        </style>
      </defs>

      {/* <!-- Tire Tread Ring --> */}
      <g className="tire-tread">
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
      <path
        d="M50 12 L18 25 V50 C18 70 45 88 50 90 C55 88 82 70 82 50 V25 Z"
        fill="hsl(var(--background))"
        stroke="hsl(var(--foreground))"
        strokeWidth="3"
      />
      
      {/* <!-- Heartbeat Line --> */}
      <path
        d="M30 52 H40 L45 47 L55 57 L60 52 H70"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="heartbeat-line"
      />
    </svg>
  );
};


export default function BrandLogo({ className, iconClassName, hideText = false }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center select-none", className)}>
        {/* Replacing the old SVG with the new SearchingIndicator component */}
        <SearchingIndicator partnerType='path' className={cn("w-10 h-10", iconClassName)} showHeartbeat={false} />
       {!hideText && <span className="text-3xl ml-2 font-extrabold tracking-tight text-foreground">Cabzi</span>}
    </div>
  )
}

export { NewLogoIcon };
