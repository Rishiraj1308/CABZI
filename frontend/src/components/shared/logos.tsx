'use client'

import React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export const OSMLLogo = ({ className }: { className?: string }) => {
    return (
        <Image
            src="/osml-logo.svg"
            alt="OpenStreetMap Logo"
            width={160}
            height={160}
            className={cn("h-20 w-auto", className)}
        />
    )
}

export const LeafletLogo = ({ className }: { className?: string }) => {
    return (
        <Image
            src="/leaflet-logo.svg"
            alt="Leaflet.js Logo"
            width={140}
            height={140}
            className={cn("h-20 w-auto", className)}
        />
    )
}
