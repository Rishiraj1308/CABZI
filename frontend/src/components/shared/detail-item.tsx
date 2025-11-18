
'use client';

import React from 'react';

interface DetailItemProps {
    icon: React.ElementType;
    label: string;
    value: string | undefined | null;
}

export const DetailItem = ({ icon: Icon, label, value }: DetailItemProps) => (
    <div className="flex items-start gap-4">
        <Icon className="w-5 h-5 text-muted-foreground mt-1" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-semibold">{value || 'N/A'}</p>
        </div>
    </div>
);
