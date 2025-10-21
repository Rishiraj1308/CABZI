
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Clock, Users, Activity, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const StatCard = ({ title, value, icon: Icon, description }: { title: string, value: string, icon: React.ElementType, description: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="w-4 h-4 text-muted-foreground"/>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Analytics & Reports</h2>
                <p className="text-muted-foreground">Data-driven insights to optimize your emergency response operations.</p>
            </div>
            
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Feature Under Development</AlertTitle>
                <AlertDescription>
                    This analytics dashboard is a preview of upcoming features. The data shown here is for demonstration purposes only.
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="Total Cases Handled"
                    value="1,254"
                    icon={Activity}
                    description="+15% from last month"
                />
                 <StatCard 
                    title="Avg. Response Time"
                    value="8.2 min"
                    icon={Clock}
                    description="-5% from last month"
                />
                 <StatCard 
                    title="Fleet Utilization"
                    value="76%"
                    icon={Users}
                    description="Peak utilization: 92%"
                />
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Emergency Case Heatmap</CardTitle>
                    <CardDescription>A visual representation of emergency case locations to identify high-demand zones.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="w-full h-80" />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Response Time by Zone</CardTitle>
                        <CardDescription>Average time taken to reach the patient across different city zones.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="w-full h-64" />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Doctor Performance</CardTitle>
                        <CardDescription>Metrics on consultations and patient feedback for your doctors.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Skeleton className="w-full h-64" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
