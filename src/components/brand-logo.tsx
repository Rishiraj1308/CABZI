
'use client'

import { cn } from '@/lib/utils'

interface BrandLogoProps {
  className?: string;
  iconClassName?: string;
  hideText?: boolean;
}


// The NewLogoIcon remains as it is for the splash screen
const NewLogoIcon = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative flex items-center justify-center w-12 h-12", className)}>
      {/* Outer gradient ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-accent to-red-500 animate-pulse-slow" />
      {/* Inner background */}
      <div className="relative w-10 h-10 bg-background rounded-full flex items-center justify-center">
        {/* Placeholder for a more complex 'C' or symbol */}
        <span className="text-xl font-bold text-primary">C</span>
      </div>
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

export { NewLogoIcon };

    