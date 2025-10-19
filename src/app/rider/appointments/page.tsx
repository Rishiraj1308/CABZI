'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Hospital, Stethoscope, Clock, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const mockHospitals = [
  { id: 'h1', name: 'Max Healthcare, Saket' },
  { id: 'h2', name: 'Apollo Hospital, Sarita Vihar' },
  { id: 'h3', name: 'Fortis Escorts, Okhla' },
  { id: 'h4', name: 'AIIMS, New Delhi' }
]

const mockDepartments = [
  'Cardiology', 'Neurology', 'Orthopedics', 'General Physician', 'Pediatrics'
]

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
]

export default function BookAppointmentPage() {
  const [hospital, setHospital] = useState('');
  const [department, setDepartment] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('');
  const [step, setStep] = useState(1);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="animate-fade-in pl-16">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-8 h-8 text-primary" />
            Book a Doctor's Appointment
        </h2>
        <p className="text-muted-foreground">Find and book appointments with top doctors seamlessly.</p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Step {step}: {step === 1 ? "Select Hospital & Department" : "Choose Date & Time"}</CardTitle>
          <CardDescription>Fill in the details to find available slots.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="hospital-search">Search for a Hospital</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="hospital-search" placeholder="e.g., Apollo Hospital" className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Select Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger id="department">
                        <SelectValue placeholder="Select a medical department" />
                    </SelectTrigger>
                    <SelectContent>
                        {mockDepartments.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
            </>
          )}
          {step === 2 && (
             <>
                <div className="space-y-2">
                    <Label>Select Appointment Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                            disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                        />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label>Select Available Time Slot</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {timeSlots.map(slot => (
                            <Button 
                                key={slot} 
                                variant={time === slot ? 'default' : 'outline'}
                                onClick={() => setTime(slot)}
                            >
                                {slot}
                            </Button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="patient-name">Patient's Full Name</Label>
                    <Input id="patient-name" placeholder="Enter patient's name" />
                </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
            {step === 2 && <Button variant="outline" onClick={() => setStep(1)}>Back</Button>}
            {step === 1 && <div></div>}
            <Button onClick={() => (step === 1 ? setStep(2) : alert('Confirming appointment...'))} disabled={step === 1 && (!hospital && !department)}>
                {step === 1 ? 'Find Slots' : 'Confirm Appointment'}
            </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
