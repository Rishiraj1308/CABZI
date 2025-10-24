
'use client'

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, CheckCircle, Percent, Video, Building, FileText, PlayCircle, Plus, UploadCloud, Search, History, BrainCircuit, AlertTriangle, Send, UserPlus, FileUp, Share } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

const mockDashboardStats = {
    todayAppointments: 12,
    newPatients: 4,
    avgConsultationTime: 15,
    pendingFollowUps: 3,
    completionRate: 95,
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
    { date: '2024-07-15', reason: 'Annual Check-up', notes: 'Routine blood work ordered. All vitals stable.' },
    { date: '2023-11-20', reason: 'Viral Fever', notes: 'Prescribed Paracetamol. Advised rest.' },
];

const quickActions = [
    { title: 'Add Appointment', icon: Plus, action: () => {} },
    { title: 'Search Patient', icon: Search, action: () => {} },
    { title: 'Upload Report', icon: UploadCloud, action: () => {} },
    { title: 'Generate Note', icon: FileText, action: () => {} },
    { title: 'View History', icon: History, action: () => {} },
];

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
]


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

  return (
    <div className="space-y-6">
       <div>
        <h2 className="text-3xl font-bold tracking-tight">Doctor's Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, Doctor. Here's your snapshot for today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Today’s Appointments" value={`${mockDashboardStats.todayAppointments}`} icon={Calendar} description="+3 from yesterday" />
        <StatCard title="New Patients Today" value={`${mockDashboardStats.newPatients}`} icon={User} description="New consultations scheduled" />
        <StatCard title="Avg. Consultation Time" value={`${mockDashboardStats.avgConsultationTime} min`} icon={Clock} description="Maintained from last week" />
        <StatCard title="Pending Follow-Ups" value={`${mockDashboardStats.pendingFollowUps}`} icon={Calendar} description="Scheduled for today" />
        <StatCard title="Completion Rate" value={`${mockDashboardStats.completionRate}%`} icon={Percent} description="Today's consultation completion" />
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Today's Schedule</CardTitle>
                        <CardDescription>A list of your confirmed and pending appointments for today.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Dialog>
                                {mockAppointments.map((apt, index) => (
                                    <Card key={index} className="bg-muted/50">
                                        <CardHeader className="p-4">
                                        <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-primary">{apt.time}</p>
                                                    <CardTitle className="text-xl">{apt.patient}</CardTitle>
                                                    <CardDescription>{apt.age} / {apt.gender}</CardDescription>
                                                </div>
                                                {getStatusBadge(apt.status)}
                                        </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0 space-y-3 text-sm">
                                            <div className="flex items-center gap-4 text-muted-foreground">
                                                <Badge variant="outline">{apt.mode === 'Online' ? <Video className="w-3 h-3 mr-1.5"/> : <Building className="w-3 h-3 mr-1.5"/>}{apt.mode}</Badge>
                                                <Badge variant="outline">{apt.visitType}</Badge>
                                            </div>
                                            <p className="text-muted-foreground"><span className="font-semibold text-foreground">Reason:</span> {apt.reason}</p>
                                        </CardContent>
                                        <CardFooter className="p-4 pt-0 flex gap-2">
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" onClick={() => setSelectedPatient(apt)}><FileText className="w-4 h-4 mr-2"/>View Details</Button>
                                            </DialogTrigger>
                                            <Button size="sm" disabled={apt.status !== 'Checked-in'}><PlayCircle className="w-4 h-4 mr-2"/>Start Consultation</Button>
                                            <Button variant="secondary" size="sm" onClick={() => toast({title: "Feature coming soon!"})}><Plus className="w-4 h-4 mr-2"/>Add Notes</Button>
                                            <Button variant="secondary" size="sm" disabled={apt.status === 'Completed'}><CheckCircle className="w-4 h-4 mr-2"/>Mark Complete</Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                                <DialogContent className="max-w-3xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl">Patient Details: {selectedPatient?.patient}</DialogTitle>
                                        <DialogDescription>
                                            Age: {selectedPatient?.age}, Gender: {selectedPatient?.gender}, Contact: {selectedPatient?.contact}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <Tabs defaultValue="history">
                                        <TabsList className="grid w-full grid-cols-4">
                                            <TabsTrigger value="history">Visit History</TabsTrigger>
                                            <TabsTrigger value="reports">Reports & Notes</TabsTrigger>
                                            <TabsTrigger value="followup">Schedule Follow-up</TabsTrigger>
                                             <TabsTrigger value="actions">Post-Consultation</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="history" className="mt-4">
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Reason for Visit</TableHead><TableHead>Doctor's Notes</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {mockPastVisits.map(visit => (
                                                        <TableRow key={visit.date}><TableCell>{visit.date}</TableCell><TableCell>{visit.reason}</TableCell><TableCell>{visit.notes}</TableCell></TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TabsContent>
                                        <TabsContent value="reports" className="mt-4 space-y-4">
                                            <Card>
                                                <CardHeader><CardTitle>Clinical Notes</CardTitle></CardHeader>
                                                <CardContent>
                                                    <Textarea placeholder="Add your clinical notes for this consultation..."/>
                                                     <Button className="mt-2" size="sm">Save Notes</Button>
                                                </CardContent>
                                            </Card>
                                             <Card>
                                                <CardHeader><CardTitle>Uploaded Reports</CardTitle></CardHeader>
                                                <CardContent>
                                                    <p className="text-sm text-muted-foreground text-center py-4">No reports have been uploaded for this patient yet.</p>
                                                    <div className="mt-4 p-6 border-2 border-dashed rounded-lg text-center">
                                                        <FileUp className="w-10 h-10 text-muted-foreground mx-auto mb-2"/>
                                                        <p className="font-semibold mb-1">Upload Prescription / Report</p>
                                                        <p className="text-xs text-muted-foreground mb-2">Drag & drop files here or click to browse.</p>
                                                        <Button size="sm" variant="outline">Browse Files</Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                        <TabsContent value="followup" className="mt-4">
                                            <Card>
                                                <CardHeader><CardTitle>Schedule a Follow-up Visit</CardTitle><CardDescription>Book the next appointment for this patient.</CardDescription></CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label>Select Date</Label>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                                                    <Calendar className="mr-2 h-4 w-4" />
                                                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0"><CalendarPicker mode="single" selected={date} onSelect={setDate} initialFocus/></PopoverContent>
                                                        </Popover>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Select Time</Label>
                                                        <div className="grid grid-cols-4 gap-2">
                                                          {timeSlots.map(slot => (<Button key={slot} variant={time === slot ? 'default' : 'outline'} onClick={() => setTime(slot)}>{slot}</Button>))}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                                <CardFooter>
                                                    <Button disabled={!date || !time}>Schedule Follow-up</Button>
                                                </CardFooter>
                                            </Card>
                                        </TabsContent>
                                         <TabsContent value="actions" className="mt-4">
                                            <Card>
                                                <CardHeader><CardTitle>Post-Consultation Actions</CardTitle><CardDescription>Additional actions to ensure patient care continuity.</CardDescription></CardHeader>
                                                <CardContent className="space-y-2">
                                                    <Button variant="outline" className="w-full justify-start gap-2"><Share className="w-4 h-4"/>Refer Patient to Specialist</Button>
                                                    <Button variant="outline" className="w-full justify-start gap-2"><Send className="w-4 h-4"/>Send Automated Care Instructions</Button>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                    </Tabs>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Common tasks, just a click away.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                        {quickActions.map(action => (
                            <Button key={action.title} variant="outline" className="flex-col h-20" onClick={() => toast({ title: `${action.title} - Coming Soon!` })}>
                                <action.icon className="w-6 h-6 mb-1 text-primary"/>
                                <span className="text-xs">{action.title}</span>
                            </Button>
                        ))}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BrainCircuit className="w-6 h-6 text-primary"/> AI Smart Assistant</CardTitle>
                        <CardDescription>Your AI-powered co-pilot for smarter consultations.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <AlertTitle>Under Development</AlertTitle>
                            <AlertDescription>
                               This advanced AI feature is currently under development.
                            </AlertDescription>
                        </Alert>
                        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                            <li>Auto-summarize last 5 consultations.</li>
                            <li>Get symptom-based diagnosis suggestions.</li>
                            <li>Autofill smart prescription templates.</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
       </div>
    </div>
  );
}

    