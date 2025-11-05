
'use client'

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, CheckCircle, Percent, Video, Building, FileText, PlayCircle, Plus, UploadCloud, Search, History, BrainCircuit, AlertTriangle, Send, UserPlus, FileUp, Share, Star, Stethoscope, FileClock, ClipboardPlus, FileSpreadsheet, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { MotionDiv } from '@/components/ui/motion-div';
import { Skeleton } from '@/components/ui/skeleton';

const mockDashboardStats = {
    todayAppointments: 12,
    avgConsultationTime: 15,
    pendingFollowUps: 3,
    satisfaction: 4.8,
};

const mockAppointments = [
  { 
    time: '10:00 AM', 
    patient: 'Priya Sharma', 
    age: 28,
    gender: 'Female',
    contact: '98XXXXXX01',
    mode: 'In-Clinic',
    visitType: 'New',
    reason: 'Fever and body ache for 2 days.',
    status: 'Confirmed' 
  },
  { 
    time: '10:30 AM', 
    patient: 'Rohan Verma', 
    age: 45,
    gender: 'Male',
    contact: '98XXXXXX02',
    mode: 'Online',
    visitType: 'Follow-up',
    reason: 'Blood pressure check-up.',
    status: 'Confirmed' 
  },
  { 
    time: '11:00 AM', 
    patient: 'Anita Desai',
    age: 62,
    gender: 'Female',
    contact: '98XXXXXX03',
    mode: 'In-Clinic',
    visitType: 'New',
    reason: 'Joint pain and swelling in knees.',
    status: 'Checked-in' 
  },
  { 
    time: '11:30 AM', 
    patient: 'Suresh Kumar', 
    age: 35,
    gender: 'Male',
    contact: '98XXXXXX04',
    mode: 'In-Clinic',
    visitType: 'Follow-up',
    reason: 'Post-operative recovery check.',
    status: 'Completed' 
  },
];

const mockPastVisits = [
    { date: '2024-07-15', reason: 'Annual Check-up', notes: 'Routine blood work ordered. All vitals stable. Advised vitamin D supplements.', report: 'Blood Test Report.pdf', prescription: 'Prescription_2024-07-15.pdf' },
    { date: '2023-11-20', reason: 'Viral Fever', notes: 'Prescribed Paracetamol and advised rest for 3 days. Patient to follow up if symptoms persist.', prescription: 'Prescription_2023-11-20.pdf' },
    { date: '2023-05-01', reason: 'Initial Consultation', notes: 'Patient presented with no major complaints. General health advice given.', report: 'Initial Health Scan.pdf' },
];

const quickActions = [
    { title: 'Add Appointment', icon: Plus, action: 'add_appointment' },
    { title: 'Search Patient', icon: Search, action: 'search_patient' },
    { title: 'Upload Report', icon: UploadCloud, action: 'upload_report' },
];

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
]

const StatCard = ({ title, value, icon: Icon, description, className }: { title: string, value: string, icon: React.ElementType, description: string, className?: string }) => (
    <Card className={cn(className)}>
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

const getStatusBadge = (status: string) => {
    switch(status) {
        case 'Confirmed': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">{status}</Badge>;
        case 'Checked-in': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">{status}</Badge>;
        case 'Completed': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
        case 'Cancelled': return <Badge variant="destructive">{status}</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
    }
}

export default function DoctorDashboardPage() {
    const [selectedPatient, setSelectedPatient] = useState<(typeof mockAppointments)[0] | null>(null);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [time, setTime] = useState('');
    const { toast } = useToast();
    
    const handleQuickAction = (action: string) => {
        toast({ title: "Feature coming soon!", description: `The "${action.replace(/_/g, ' ')}" functionality is under development.` });
    };

    const handleAppointmentAction = (action: string) => {
        toast({ title: "Action performed (prototype)", description: `This would ${action.replace(/_/g, ' ')}.` });
    }
    
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };
    
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 }}
    };

  return (
    <div className="space-y-6">
       <div>
        <h2 className="text-3xl font-bold tracking-tight">Doctor's Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, Doctor. Here's your snapshot for today.</p>
      </div>
      
      <MotionDiv variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MotionDiv variants={itemVariants}><StatCard title="Today’s Appointments" value={`${mockDashboardStats.todayAppointments}`} icon={Calendar} description="Total patients scheduled" /></MotionDiv>
        <MotionDiv variants={itemVariants}><StatCard title="Avg. Consultation Time" value={`${mockDashboardStats.avgConsultationTime} min`} icon={Clock} description="Maintained from last week" /></MotionDiv>
        <MotionDiv variants={itemVariants}><StatCard title="Patient Satisfaction" value={`${mockDashboardStats.satisfaction}/5`} icon={Star} description="Based on 152 reviews" /></MotionDiv>
        <MotionDiv variants={itemVariants}><StatCard title="Pending Follow-Ups" value={`${mockDashboardStats.pendingFollowUps}`} icon={FileClock} description="Scheduled for today" /></MotionDiv>
      </MotionDiv>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Today's Patient Queue</CardTitle>
                        <CardDescription>A real-time queue of your appointments for today.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Dialog>
                                {mockAppointments.map((apt, index) => (
                                     <MotionDiv
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + index * 0.1 }}
                                    >
                                        <Card className="bg-muted/30">
                                            <CardContent className="p-4 flex items-center gap-4">
                                                <div className="text-center w-20">
                                                    <p className="font-bold text-primary text-lg">{apt.time.split(' ')[0]}</p>
                                                    <p className="text-xs text-muted-foreground">{apt.time.split(' ')[1]}</p>
                                                </div>
                                                <div className="flex-1">
                                                    <CardTitle className="text-lg">{apt.patient}</CardTitle>
                                                    <CardDescription>{apt.age} / {apt.gender} • {apt.reason}</CardDescription>
                                                </div>
                                                <div className="flex flex-col items-center gap-2">
                                                    {getStatusBadge(apt.status)}
                                                </div>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" onClick={() => setSelectedPatient(apt)}>View EMR</Button>
                                                </DialogTrigger>
                                            </CardContent>
                                        </Card>
                                    </MotionDiv>
                                ))}
                                 <DialogContent className="max-w-4xl h-[90vh]">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl">EMR / Patient Details: {selectedPatient?.patient}</DialogTitle>
                                        <DialogDescription>Age: {selectedPatient?.age}, Gender: {selectedPatient?.gender}, Contact: {selectedPatient?.contact}</DialogDescription>
                                    </DialogHeader>
                                    <Tabs defaultValue="history" className="flex-1 flex flex-col overflow-hidden">
                                        <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="history">Timeline</TabsTrigger><TabsTrigger value="reports">Notes & Reports</TabsTrigger><TabsTrigger value="followup">Follow-up</TabsTrigger><TabsTrigger value="actions">Actions</TabsTrigger></TabsList>
                                        <TabsContent value="history" className="mt-4 flex-1 overflow-y-auto p-1 pr-4">
                                            <div className="relative pl-6">
                                                <div className="absolute left-9 top-0 h-full w-0.5 bg-border -translate-x-1/2"></div>
                                                <div className="space-y-8">
                                                    {mockPastVisits.map((visit, index) => (
                                                        <div key={index} className="relative">
                                                            <div className="absolute top-0 left-9 -translate-x-1/2 w-4 h-4 bg-primary rounded-full border-4 border-background"></div>
                                                            <div className="pl-12">
                                                                <Card><CardHeader className="pb-3"><CardTitle className="text-lg">{visit.reason}</CardTitle><CardDescription className="flex items-center gap-2"><Calendar className="w-3 h-3"/> {visit.date}</CardDescription></CardHeader><CardContent className="space-y-3"><div><h4 className="font-semibold text-xs mb-1">Doctor's Notes</h4><p className="text-xs text-muted-foreground bg-muted p-2 rounded-md">{visit.notes}</p></div><div className="flex gap-2">{visit.report && <Button variant="outline" size="sm" className="h-7" onClick={() => handleQuickAction('view_report')}><FileSpreadsheet className="w-3 h-3 mr-2"/>{visit.report}</Button>}{visit.prescription && <Button variant="outline" size="sm" className="h-7" onClick={() => handleQuickAction('view_prescription')}><ClipboardPlus className="w-3 h-3 mr-2"/>{visit.prescription}</Button>}</div></CardContent></Card>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="reports" className="mt-4 space-y-4 flex-1 overflow-y-auto p-1 pr-4"><Card><CardHeader><CardTitle>Clinical Notes</CardTitle></CardHeader><CardContent><Textarea placeholder="Add your clinical notes for this consultation..."/> <Button className="mt-2" size="sm" onClick={() => handleQuickAction('save_notes')}>Save Notes</Button></CardContent></Card><Card><CardHeader><CardTitle>Uploaded Reports</CardTitle></CardHeader><CardContent><div className="mt-4 p-6 border-2 border-dashed rounded-lg text-center"><FileUp className="w-10 h-10 text-muted-foreground mx-auto mb-2"/><p className="font-semibold mb-1">Upload Prescription / Report</p><p className="text-xs text-muted-foreground mb-2">Drag & drop files here or click to browse.</p><Button size="sm" variant="outline" onClick={() => handleQuickAction('upload_report')}>Browse Files</Button></div></CardContent></Card></TabsContent>
                                        <TabsContent value="followup" className="mt-4 flex-1 overflow-y-auto p-1 pr-4"><Card><CardHeader><CardTitle>Schedule a Follow-up Visit</CardTitle><CardDescription>Book the next appointment for this patient.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label>Select Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}><Calendar className="mr-2 h-4 w-4" />{date ? format(date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><CalendarPicker mode="single" selected={date} onSelect={setDate} initialFocus/></PopoverContent></Popover></div><div className="space-y-2"><Label>Select Time</Label><div className="grid grid-cols-4 gap-2">{timeSlots.map(slot => (<Button key={slot} variant={time === slot ? 'default' : 'outline'} onClick={() => setTime(slot)}>{slot}</Button>))}</div></div></CardContent><CardFooter><Button disabled={!date || !time} onClick={() => handleQuickAction('schedule_follow_up')}>Schedule Follow-up</Button></CardFooter></Card></TabsContent>
                                        <TabsContent value="actions" className="mt-4 flex-1 overflow-y-auto p-1 pr-4"><Card><CardHeader><CardTitle>Post-Consultation Actions</CardTitle><CardDescription>Additional actions to ensure patient care continuity.</CardDescription></CardHeader><CardContent className="space-y-2"><Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleQuickAction('refer_patient')}><Share className="w-4 h-4"/>Refer Patient to Specialist</Button><Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleQuickAction('send_instructions')}><Send className="w-4 h-4"/>Send Automated Care Instructions</Button></CardContent></Card></TabsContent>
                                    </Tabs>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-3 gap-2">
                        {quickActions.map(action => (
                            <Button key={action.title} variant="outline" className="flex-col h-20 gap-1" onClick={() => handleQuickAction(action.action)}>
                                <action.icon className="w-6 h-6 text-primary"/>
                                <span className="text-xs">{action.title}</span>
                            </Button>
                        ))}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Smart Assistant</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <AlertTitle>Under Development</AlertTitle>
                            <AlertDescription>
                               This advanced AI feature is currently under development.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
       </div>
    </div>
  );
}
