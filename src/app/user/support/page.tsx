
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LifeBuoy, FileQuestion, Mail, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUser } from '@/components/client-session-provider';


const supportTopics = [
    {
        icon: FileQuestion,
        title: 'FAQs',
        description: 'Find answers to common questions about rides, payments, and your account.',
        action: 'View FAQs',
        isDialog: false,
    },
    {
        icon: Mail,
        title: 'Email Support',
        description: 'Get in touch with our support team via email for any issues.',
        action: 'Email Us',
        isDialog: false,
    },
    {
        icon: Shield,
        title: 'Safety Center',
        description: 'Learn about our safety features and what we do to protect you.',
        action: 'Visit Safety Center',
        isDialog: false,
    }
]

export default function UserSupportPage() {
    const { toast } = useToast();
    
    const handleActionClick = (action: string) => {
        toast({
            title: 'Action Triggered',
            description: `This will ${action}. This feature is coming soon.`,
        });
    }
    
    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="animate-fade-in">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <LifeBuoy className="w-8 h-8 text-primary" /> 
                    Help & Support
                </h2>
                <p className="text-muted-foreground">We&apos;re here to help you with any issues.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                {supportTopics.map(topic => {
                    const cardContent = (
                        <Card key={topic.title} className="bg-muted/30 flex flex-col h-full">
                            <CardHeader className="flex-row items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-lg">
                                    <topic.icon className="w-6 h-6 text-primary"/>
                                </div>
                                <div className="flex-1">
                                    <CardTitle>{topic.title}</CardTitle>
                                    <CardDescription>{topic.description}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="mt-auto">
                                <Button variant="outline" className="w-full">
                                    {topic.action}
                                </Button>
                            </CardContent>
                        </Card>
                    );

                    return <div key={topic.title} onClick={() => handleActionClick(topic.action)}>{cardContent}</div>
                })}
            </div>
        </div>
    )
}
