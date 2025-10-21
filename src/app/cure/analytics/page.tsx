
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart as BarChartIcon, Clock, Users, Activity, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'


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
                    <div className="w-full h-80 bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">Heatmap data will be displayed here</p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Response Time by Zone (Avg. Mins)</CardTitle>
                        <CardDescription>Average time taken to reach the patient across different city zones.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ChartContainer config={{ time: { label: "Time (min)", color: "hsl(var(--primary))" } }} className="h-64">
                            <BarChart data={responseTimeData}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="zone" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="time" fill="var(--color-time)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Peak Hours (Total Cases)</CardTitle>
                        <CardDescription>Number of emergency cases received at different times of the day.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ChartContainer config={{ cases: { label: "Cases", color: "hsl(var(--destructive))" } }} className="h-64">
                             <BarChart data={casesByHourData}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} />
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
