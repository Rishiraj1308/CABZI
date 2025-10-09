
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts"
import { translations } from '@/lib/translations'
import { Download, NotebookText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useMemo } from 'react'


const chartConfig = {
  responses: {
    label: "Responses",
    color: "hsl(var(--primary))",
  },
}

// This function is now separate to be used by the main component
const generateMockData = (options: string[]) => {
    return options.map(option => ({
        name: option,
        total: Math.floor(Math.random() * (150 - 20 + 1) + 20) // Random number between 20 and 150
    }));
}

const riderQuestions = [
    { id: 'q1_rider', question: translations['en']['survey_rider_q1'], options: translations['en']['survey_rider_q1_options'].split('|') },
    { id: 'q2_rider', question: translations['en']['survey_rider_q2'], options: translations['en']['survey_rider_q2_options'].split('|') },
    { id: 'q3_rider', question: translations['en']['survey_rider_q3'], options: translations['en']['survey_rider_q3_options'].split('|') },
    { id: 'q4_rider', question: translations['en']['survey_rider_q4'], options: translations['en']['survey_rider_q4_options'].split('|') },
    { id: 'q5_rider', question: translations['en']['survey_rider_q5'], options: translations['en']['survey_rider_q5_options'].split('|') },
    { id: 'q6_rider', question: translations['en']['survey_rider_q6'], options: translations['en']['survey_rider_q6_options'].split('|') },
    { id: 'q7_rider', question: translations['en']['survey_rider_q7'], options: translations['en']['survey_rider_q7_options'].split('|') },
    { id: 'q8_rider', question: translations['en']['survey_rider_q8'], options: translations['en']['survey_rider_q8_options'].split('|') },
    { id: 'q9_rider', question: translations['en']['survey_rider_q9'], options: translations['en']['survey_rider_q9_options'].split('|') },
    { id: 'q10_rider', question: translations['en']['survey_rider_q10'], options: translations['en']['survey_rider_q10_options'].split('|') },
];

const partnerQuestions = [
    { id: 'q1_partner', question: translations['en']['survey_partner_q1'], options: translations['en']['survey_partner_q1_options'].split('|') },
    { id: 'q2_partner', question: translations['en']['survey_partner_q2'], options: translations['en']['survey_partner_q2_options'].split('|') },
    { id: 'q3_partner', question: translations['en']['survey_partner_q3'], options: translations['en']['survey_partner_q3_options'].split('|') },
    { id: 'q4_partner', question: translations['en']['survey_partner_q4'], options: translations['en']['survey_partner_q4_options'].split('|') },
    { id: 'q5_partner', question: translations['en']['survey_partner_q5'], options: translations['en']['survey_partner_q5_options'].split('|') },
    { id: 'q6_partner', question: translations['en']['survey_partner_q6'], options: translations['en']['survey_partner_q6_options'].split('|') },
    { id: 'q7_partner', question: translations['en']['survey_partner_q7'], options: translations['en']['survey_partner_q7_options'].split('|') },
    { id: 'q8_partner', question: translations['en']['survey_partner_q8'], options: translations['en']['survey_partner_q8_options'].split('|') },
    { id: 'q9_partner', question: translations['en']['survey_partner_q9'], options: translations['en']['survey_partner_q9_options'].split('|') },
    { id: 'q10_partner', question: translations['en']['survey_partner_q10'], options: translations['en']['survey_partner_q10_options'].split('|') },
];

interface SurveyData {
    id: string;
    question: string;
    options: string[];
    data: { name: string; total: number }[];
}

const ReportChart = ({ question, data }: { question: string, data: { name: string; total: number }[] }) => {
    const chartData = data.map(item => ({ name: item.name, responses: item.total }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-semibold">{question}</CardTitle>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={chartConfig} className="h-64 w-full">
                    <BarChart
                        accessibilityLayer
                        data={chartData}
                        layout="vertical"
                        margin={{ left: 10, right: 40 }}
                    >
                        <CartesianGrid horizontal={false} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                            width={120}
                        />
                        <XAxis dataKey="responses" type="number" hide />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="responses" fill="var(--color-responses)" radius={4}>
                            <LabelList
                                position="right"
                                offset={8}
                                className="fill-foreground"
                                fontSize={12}
                            />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}


export default function SurveyReportPage() {
    const { toast } = useToast();

    // Pre-generate the data for both surveys so it can be used by charts and the download function
    const riderSurveyData: SurveyData[] = useMemo(() => riderQuestions.map(q => ({
        ...q,
        data: generateMockData(q.options)
    })), []);

    const partnerSurveyData: SurveyData[] = useMemo(() => partnerQuestions.map(q => ({
        ...q,
        data: generateMockData(q.options)
    })), []);

    const handleDownload = () => {
        let reportContent = "Cabzi Market Survey Report\n============================\n\n";

        reportContent += "RIDER SURVEY RESULTS\n--------------------------\n\n";
        riderSurveyData.forEach((surveyItem, index) => {
            reportContent += `Q${index + 1}: ${surveyItem.question}\n`;
            surveyItem.data.forEach(result => {
                reportContent += `- ${result.name}: ${result.total} responses\n`;
            });
            reportContent += `\n`;
        });

        reportContent += "\n\nPARTNER (DRIVER) SURVEY RESULTS\n---------------------------------\n\n";
        partnerSurveyData.forEach((surveyItem, index) => {
            reportContent += `Q${index + 1}: ${surveyItem.question}\n`;
            surveyItem.data.forEach(result => {
                reportContent += `- ${result.name}: ${result.total} responses\n`;
            });
            reportContent += `\n`;
        });

        const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'cabzi-survey-report-with-results.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
            title: "Report Download Started",
            description: "The survey report with results is being downloaded.",
        });
    }
  
  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <NotebookText className="w-8 h-8 text-primary" />
                    Market Survey Report
                </h2>
                <p className="text-muted-foreground">A visual breakdown of user feedback from the market survey.</p>
            </div>
            <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download Report with Results
            </Button>
        </div>

        <Tabs defaultValue="rider">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="rider">Rider Survey Report</TabsTrigger>
                <TabsTrigger value="partner">Partner Survey Report</TabsTrigger>
            </TabsList>
            <TabsContent value="rider" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {riderSurveyData.map(q => (
                        <ReportChart key={q.id} question={q.question} data={q.data} />
                    ))}
                </div>
            </TabsContent>
            <TabsContent value="partner" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {partnerSurveyData.map(q => (
                         <ReportChart key={q.id} question={q.question} data={q.data} />
                    ))}
                </div>
            </TabsContent>
        </Tabs>
    </div>
  )
}
