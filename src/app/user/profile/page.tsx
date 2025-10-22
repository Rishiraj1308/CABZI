
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Home, Briefcase, Settings, FileText, User, LogOut, Camera } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface UserProfile {
    name: string;
    phone: string;
    photoUrl?: string;
}

export default function UserProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const session = localStorage.getItem('cabzi-session');
        if (session) {
            const { name, phone } = JSON.parse(session);
            // In a real app, you'd fetch the photoUrl from your database
            setProfile({ name, phone, photoUrl: `https://placehold.co/100x100.png` });
        }
        setIsLoading(false);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('cabzi-session');
        toast({
            title: 'Logged Out',
            description: 'You have been successfully logged out.'
        });
        router.push('/');
    }

    const getInitials = (name: string) => {
        if (!name) return 'U';
        const names = name.split(' ');
        return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
    }
    
    if (isLoading) {
        return (
            <div className="p-4 md:p-6 space-y-6">
                 <Skeleton className="h-10 w-48" />
                 <Card>
                    <CardHeader className="items-center text-center">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="space-y-2 mt-4">
                            <Skeleton className="h-8 w-40" />
                            <Skeleton className="h-5 w-32" />
                        </div>
                    </CardHeader>
                 </Card>
                  <Card>
                    <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="animate-fade-in pl-16">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    My Profile
                </h2>
                <p className="text-muted-foreground">Manage your account details and preferences.</p>
            </div>

            <Card>
                <CardHeader className="items-center text-center">
                    <div className="relative">
                        <Avatar className="w-24 h-24 border-4 border-primary">
                            <AvatarImage src={profile?.photoUrl} alt={profile?.name} data-ai-hint="customer portrait" />
                            <AvatarFallback className="text-3xl">{getInitials(profile?.name || '').toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <Button variant="outline" size="icon" className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 bg-background">
                            <Camera className="w-4 h-4"/>
                            <span className="sr-only">Change photo</span>
                        </Button>
                    </div>
                    <div className="pt-2">
                        <CardTitle className="text-2xl">{profile?.name}</CardTitle>
                        <CardDescription>+91 {profile?.phone}</CardDescription>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Saved Locations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Home className="w-5 h-5 text-muted-foreground"/>
                        <Input placeholder="Add Home address" />
                        <Button variant="outline">Save</Button>
                    </div>
                     <div className="flex items-center gap-4">
                        <Briefcase className="w-5 h-5 text-muted-foreground"/>
                        <Input placeholder="Add Work address" />
                        <Button variant="outline">Save</Button>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Settings & Legal</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-2">
                        <Button variant="ghost" className="w-full justify-start gap-2"><Settings className="w-5 h-5"/> Account Settings</Button>
                        <Button variant="ghost" className="w-full justify-start gap-2"><FileText className="w-5 h-5"/> Terms of Service</Button>
                        <Button variant="ghost" className="w-full justify-start gap-2"><FileText className="w-5 h-5"/> Privacy Policy</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Account Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full">
                                <LogOut className="mr-2 h-4 w-4" /> Logout
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You will be returned to the home page and will need to log in again to book a ride.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
                                    Logout
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    )
}

    