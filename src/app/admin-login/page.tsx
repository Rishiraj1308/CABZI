
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import BrandLogo from '@/components/brand-logo'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

// Mock admin users for prototype purposes
const MOCK_ADMIN_USERS = [
    { id: 'owner@cabzi.com', password: 'password123', name: 'Platform Owner', role: 'Platform Owner' },
    { id: 'cofounder@cabzi.com', password: 'password123', name: 'Co-founder', role: 'Co-founder' },
    { id: 'manager@cabzi.com', password: 'password123', name: 'Alok Singh', role: 'Manager' },
    { id: 'support@cabzi.com', password: 'password123', name: 'Priya Sharma', role: 'Support Staff' },
    { id: 'intern@cabzi.com', password: 'password123', name: 'Rahul Verma', role: 'Tech Intern' },
];

export default function AdminLoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [adminId, setAdminId] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAdminLogin = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const user = MOCK_ADMIN_USERS.find(u => u.id === adminId && u.password === adminPassword);
        
        // Simulate network delay
        setTimeout(() => {
            if (user) {
                // In a real app, you'd get a token from your backend.
                // For this prototype, we'll store a simple session object.
                localStorage.setItem('cabzi-session', JSON.stringify({ 
                    role: 'admin', 
                    name: user.name,
                    adminRole: user.role,
                    email: user.id,
                }));
                
                toast({ 
                    title: "Login Successful", 
                    description: `Welcome, ${user.role}!`
                });
                router.push('/admin');
            } else {
                toast({
                    variant: 'destructive',
                    title: "Authentication Failed",
                    description: "Invalid Admin ID or Password.",
                });
            }
            setIsLoading(false);
        }, 1000);
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center">
                        <Link href="/" className="mx-auto">
                            <BrandLogo />
                        </Link>
                        <CardTitle className="text-2xl mt-4">Admin Panel Login</CardTitle>
                        <CardDescription>
                            Please enter your credentials to access the command center.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAdminLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="adminId">Admin ID (Email)</Label>
                                <Input 
                                    id="adminId" 
                                    name="adminId" 
                                    type="email" 
                                    placeholder="owner@cabzi.com" 
                                    required 
                                    value={adminId} 
                                    onChange={(e) => setAdminId(e.target.value)} 
                                    disabled={isLoading} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="adminPassword">Password</Label>
                                <Input 
                                    id="adminPassword" 
                                    name="adminPassword" 
                                    type="password" 
                                    placeholder="••••••••" 
                                    required 
                                    value={adminPassword} 
                                    onChange={(e) => setAdminPassword(e.target.value)} 
                                    disabled={isLoading}
                                />
                            </div>
                            <Button type="submit" className="w-full h-11" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
