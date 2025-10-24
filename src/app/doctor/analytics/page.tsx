'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart as BarChartIcon, Clock, Users, Star, Activity } from 'lucide-react'
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


const patientVolumeData = [
    { month: 'Apr', new: 80, returning: 40 },
    { month: 'May', new: 95, returning: 55 },
    { month: 'Jun', new: 110, returning: 60 },
    { month: 'Jul', new: 105, returning: 75 },
    { month: 'Aug', new: 120, returning: 85 },
];

const commonCasesData = [
    { reason: 'Fever/Flu', count: 180 },
    { reason: 'Check-up', count: 150 },
    { reason: 'Ortho Pain', count: 120 },
    { reason: 'Skin Issue', count: 95 },
    { reason: 'Stomach Ache', count: 80 },
];

const patientChartConfig = {
    new: { label: 'New Patients', color: 'hsl(var(--primary))' },
    returning: { label: 'Returning Patients', color: 'hsl(var(--secondary))' },
};

const casesChartConfig = {
    count: { label: 'Cases', color: 'hsl(var(--destructive))' },
};


export default function DoctorAnalyticsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Analytics & Insights</h2>
                <p className="text-muted-foreground">Understand your patient trends and consultation patterns.</p>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Monthly Patients"
                    value="205"
                    icon={Users}
                    description="Total patients this month"
                />
                 <StatCard 
                    title="Avg. Consultation Time"
                    value="14 min"
                    icon={Clock}
                    description="Down from 16 min last month"
                />
                 <StatCard 
                    title="Avg. Feedback Rating"
                    value="4.8/5"
                    icon={Star}
                    description="Based on 152 reviews"
                />
                 <StatCard 
                    title="Follow-up Rate"
                    value="41%"
                    icon={Activity}
                    description="Patients returning for follow-up"
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Patient Volume (Monthly)</CardTitle>
                        <CardDescription>New vs. Returning patients over the past few months.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ChartContainer config={patientChartConfig} className="h-64">
                            <BarChart data={patientVolumeData}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <Bar dataKey="new" fill="var(--color-new)" radius={4} />
                                <Bar dataKey="returning" fill="var(--color-returning)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Most Common Consultations</CardTitle>
                        <CardDescription>Top reasons for patient visits in the last 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ChartContainer config={casesChartConfig} className="h-64">
                             <BarChart data={commonCasesData} layout="vertical">
                                <CartesianGrid horizontal={false} />
                                <YAxis dataKey="reason" type="category" tickLine={false} axisLine={false} tickMargin={8} className="text-xs"/>
                                <XAxis type="number" />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
