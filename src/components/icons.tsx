
import type { SVGProps } from 'react';
import {CheckCircle, Percent, HeartHandshake, ShieldCheck} from "lucide-react";


export function BikeIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0m-9 0h1m12 0h-1m-7-5l1.5-3l1.5-1.5a1.7 1.7 0 0 0-2.3-2.5l-3.2.5l-1.5 3H5m4.5 0l2-4l-2-3l3-1l3 3" /></svg>
    )
}

export function AutoIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 10c0-2-1-4-2-5s-3-2-5-2H8c-4 0-5 2-5 5v5c0 2 2 3 4 3h.4c.3 1.2.8 2.3 1.6 3.1c.8.9 2 1.9 4 1.9s3.2-1 4-1.9c.8-.8 1.3-1.9 1.6-3.1H18c2 0 4-1 4-3v-2m-3-4H8M5 11h14M7 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0m10-5h-4" /></svg>
    )
}

export function CabIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0m14 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0m-2-5h2.5c.8 0 1.5-.7 1.5-1.5S20.8 9 20 9H4.2c-.6 0-1.2.4-1.2 1s.6 1.8 1.2 1.8H15m-7-5l1.5-4.5h4L15 7H8Z" /></svg>
    )
}
export function TotoIcon(props: SVGProps<SVGSVGElement>) { // Using a truck icon for "Toto"
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M5 17H3V6a1 1 0 0 1 1-1h9v12H9" /><path d="M14 17h1a1 1 0 0 0 1-1v-1m-1-8h4l3 4v4m-8-4v-4m0 4h-3" /></g></svg>
    )
}

export function HeartHandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M12 5c-5 0-6 3-6 4" />
    </svg>
  )
}

export function WrenchIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    )
}

export function CurePartnerIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M10 10H6m2-2v4"/><path d="M14 18V9a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10.5a2.5 2.5 0 0 0 2.5-2.5V18"/><path d="M18 18h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2zM12 11h4m-1.5 4H16"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></g></svg>
    )
}
    
export { CheckCircle, Percent, HeartHandshake, ShieldCheck };
