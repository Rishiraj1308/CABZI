
'use client';

import React from 'react';

// Custom Bike Icon
export const BikeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="5.5" cy="17.5" r="3.5"/>
        <circle cx="18.5" cy="17.5" r="3.5"/>
        <path d="M15 17.5h-5.5L8 6.5l4-1 4 5 2 6h-2"/>
    </svg>
);

// Custom Auto Rickshaw Icon
export const AutoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M20 6c-1.3 0-2.6.5-3.5 1.5L13 11H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1"/>
        <path d="m11 11-2 2.5"/>
        <path d="M16.5 17.5a2.5 2.5 0 0 1-5 0"/>
        <path d="M5 17.5a2.5 2.5 0 0 1-5 0"/>
        <path d="M14 6h4a2 2 0 0 1 2 2v2h-6"/>
    </svg>
);

// Custom Cab Icon
export const CabIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9L1 16v5c0 .6.4 1 1 1h2"/>
        <path d="M7 17h10"/>
        <circle cx="7.5" cy="17.5" r="2.5"/>
        <circle cx="16.5" cy="17.5" r="2.5"/>
    </svg>
);
