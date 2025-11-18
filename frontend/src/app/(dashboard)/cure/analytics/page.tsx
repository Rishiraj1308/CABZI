'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart as BarChartIcon, Clock, Users, Activity, AlertTriangle, Hospital, Map } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import dynamic from 'next/dynamic'
import type { ActiveEntity } from '@/app/(dashboard)/admin/map/page'

const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>,
});

const HeatmapLayer = dynamic(() => import('@/features/user/components/ride/HeatmapLayer'), {
    ssr: false,
});


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

const responseTimeData = [
  { zone: 'South Delhi', time: 7.2 },
  { zone: 'Gurgaon', time: 8.5 },
  { zone: 'Noida', time: 9.1 },
  { zone: 'East Delhi', time: 10.5 },
  { zone: 'West Delhi', time: 8.8 },
];

const casesByHourData = [
  { hour: '08 AM', cases: 5 },
  { hour: '11 AM', cases: 12 },
  { hour: '02 PM', cases: 8 },
  { hour: '05 PM', cases: 15 },
  { hour: '08 PM', cases: 22 },
  { hour: '11 PM', cases: 18 },
]

const mockHotspots: [number, number][] = [
    [28.566, 77.212], // AIIMS
    [28.567, 77.213],
    [28.565, 77.211],
    [28.496, 77.088], // Cyber Hub
    [28.497, 77.089],
    [28.495, 77.087],
    [28.498, 77.086],
    [28.570, 77.323], // Noida Sec 18
    [28.571, 77.324],
    [28.632, 77.217], // Connaught Place
    [28.633, 77.218],
    [28.524, 77.212], // Saket
];


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
                    <CardTitle className="flex items-center gap-2"><Map className="w-5 h-5 text-primary"/> Emergency Case Heatmap</CardTitle>
                    <CardDescription>A visual representation of emergency case locations. Use this to identify high-demand "hotspots" and strategically position your ambulance fleet to reduce response times.</CardDescription>
                </CardHeader>
                <CardContent className="h-80 w-full p-0 rounded-lg overflow-hidden">
                   <LiveMap center={[28.58, 77.2]} zoom={11}>
                       <HeatmapLayer points={mockHotspots} />
                   </LiveMap>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Response Time by Zone (Avg. Mins)</CardTitle>
                        <CardDescription>Compare the average time taken to reach a patient across different city zones. This helps identify areas where operational efficiency can be improved.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ChartContainer config={{ time: { label: "Time (min)", color: "hsl(var(--primary))" } }} className="h-64">
                            <BarChart data={responseTimeData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="zone" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                <YAxis tickFormatter={(value) => `${value}m`} />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                <Bar dataKey="time" fill="var(--color-time)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Peak Hours for Emergencies</CardTitle>
                        <CardDescription>Understand when emergency cases peak during the day to optimize staff and fleet scheduling for maximum availability during high-demand periods.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ChartContainer config={{ cases: { label: "Cases", color: "hsl(var(--destructive))" } }} className="h-64">
                             <BarChart data={casesByHourData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                <YAxis />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="cases" fill="var(--color-cases)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
