
'use server'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Handshake, CheckCircle, CircleHelp, AlertTriangle } from 'lucide-react'
import PartnersClient from './partners-client'


interface StatCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: React.ElementType;
}

const StatCard = ({ title, value, description, icon: Icon }: StatCardProps) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);


export default async function AdminPartnersPage() {
  
  // Stats can be calculated on the client side inside PartnersClient
  // to avoid server-side data fetching issues for now.

  return (
      <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Stat cards can be populated by the client component */}
              <StatCard title="Total Partners" value="..." description="Path, ResQ, and Cure" icon={Handshake} />
              <StatCard title="Verified" value="..." description="Active on the platform" icon={CheckCircle} />
              <StatCard title="Pending Verification" value="..." description="Awaiting admin approval" icon={CircleHelp} />
              <StatCard title="Flagged/Rejected" value="..." description="Suspended or rejected partners" icon={AlertTriangle} />
          </div>
          <PartnersClient />
      </div>
  );
}
