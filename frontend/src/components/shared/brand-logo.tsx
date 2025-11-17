
'use client'

import { cn } from '@/lib/utils'

interface BrandLogoProps {
  className?: string;
  iconClassName?: string;
  hideText?: boolean;
}

// The "Curocity Mark" Logo
// This final design is minimalist, clever, and professional.
// It combines the letter 'C' with the shape of a map location pin.
// - The 'C' stands for Curocity.
// - The Pin represents mobility, location, and our core service area (PATH).
// - The open, enclosing shape provides a sense of shelter and safety (CURE & ResQ).
export const NewLogoIcon = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative flex items-center justify-center w-12 h-12", className)}>
       <svg
          width="100%"
          height="100%"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
             <linearGradient id="curocity-mark-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
          
          {/* The Curocity Mark */}
          <path 
            d="M18.364 5.63604C16.5055 3.77757 14.0793 2.66675 11.5 2.66675C6.80558 2.66675 3 7.47233 3 12.1667C3 18.1667 11.5 22.6667 11.5 22.6667C11.5 22.6667 20 18.1667 20 12.1667C20 9.58748 18.8892 7.1612 17 5.3027" 
            stroke="url(#curocity-mark-gradient)" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
           {/* The inner dot of the pin */}
          <circle cx="11.5" cy="11.5" r="2.5" fill="hsl(var(--primary))" />
        </svg>
    </div>
  );
};


export default function BrandLogo({ className, iconClassName, hideText = false }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center select-none", className)}>
        <NewLogoIcon className={cn("w-10 h-10", iconClassName)} />
       {!hideText && <span className="text-xl ml-2 font-extrabold tracking-tight animate-text-gradient bg-gradient-to-r from-primary via-accent to-primary font-headline">Curocity</span>}
    </div>
  )
}
