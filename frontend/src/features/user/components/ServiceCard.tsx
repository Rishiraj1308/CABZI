
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ServiceCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
    tag?: string;
    href: string;
    iconBgClass: string;
    iconColorClass: string;
    tagBgClass?: string;
    tagColorClass?: string;
    tagIcon?: React.ElementType;
    className?: string;
    glowColor?: string;
}

export const ServiceCard = ({
    icon: Icon,
    title,
    description,
    tag,
    href,
    iconBgClass,
    iconColorClass,
    tagBgClass,
    tagColorClass,
    tagIcon: TagIcon,
    className,
    glowColor,
}: ServiceCardProps) => {
    const cardStyle = glowColor ? { '--glow-color': glowColor } as React.CSSProperties : {};
    const isDisabled = !href || href === '#';

    const cardContent = (
        <Card
            style={cardStyle}
            className={cn(
                "group card-glow bg-card/80 backdrop-blur-sm h-full flex flex-col p-4",
                isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                className
            )}
        >
            <div className="flex items-center gap-4">
                 <div className={cn("flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0", iconBgClass)}>
                     <Icon className={cn("h-5 w-5", iconColorClass)} />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-base">{title}</h3>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <div className="flex items-center gap-3">
                    {tag && (
                      <Badge variant="outline" className={cn("flex items-center gap-1 text-xs", tagBgClass, tagColorClass)}>
                        {TagIcon && <TagIcon className="h-3 w-3" />}
                        <span>{tag}</span>
                      </Badge>
                    )}
                    {!isDisabled && <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:translate-x-0.5 group-hover:text-primary transition-transform" />}
                </div>
            </div>
        </Card>
    );

    if (isDisabled) {
        return <div className="cursor-not-allowed">{cardContent}</div>;
    }

    return (
        <Link href={href} passHref legacyBehavior>
            <a className="no-underline">
                {cardContent}
            </a>
        </Link>
    );
};
