'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Car, Wrench, Users, Ambulance, type LucideIcon } from 'lucide-react'
import type { AdminStats } from '../hooks/useAdminStats'

interface StatCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: LucideIcon;
    link: string;
}

const StatCard = ({ title, value, description, icon: Icon, link }: StatCardProps) => (
    <Link href={link} legacyBehavior>
      <a className="block">
        <Card className="hover:bg-muted transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
      </a>
    </Link>
);


interface StatCardsProps {
    stats: AdminStats;
}

export const StatCards = ({ stats }: StatCardsProps) => {
    const cards: StatCardProps[] = [
        { title: "Total Path Partners", value: stats.totalPath, description: "All drivers (Bike, Auto, Cab)", icon: Car, link: "/admin/partners" },
        { title: "Total ResQ Partners", value: stats.totalResq, description: "All mechanics & garages", icon: Wrench, link: "/admin/partners" },
        { title: "Total Cure Partners", value: stats.totalCure, description: "All hospitals & clinics", icon: Ambulance, link: "/admin/partners" },
        { title: "Total Customers", value: stats.totalCustomers, description: "All registered riders", icon: Users, link: "/admin/customers" },
    ];
    
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map(card => <StatCard key={card.title} {...card} />)}
        </div>
    );
};

export const StatCardSkeleton = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
             <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-1/4 mb-1" />
                    <Skeleton className="h-4 w-full" />
                </CardContent>
            </Card>
        ))}
    </div>
);
