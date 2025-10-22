'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LifeBuoy, FileQuestion, Mail, Shield, MessageSquare, Send, Bot } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
        icon: Bot,
        title: 'AI Support Bot',
        description: 'Get instant help from our AI assistant for any issue, 24/7.',
        action: 'Start Chat',
        isDialog: true,
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
    const [chatMessages, setChatMessages] = useState([
        { from: 'support', text: 'Hello! I am your Cabzi AI Assistant. How can I help you today?' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { session } = useUser();

    const handleActionClick = (action: string) => {
        toast({
            title: 'Action Triggered',
            description: `This will ${action}. This feature is coming soon.`,
        });
    }

    const handleSendMessage = async () => {
        if (chatInput.trim() === '' || isSubmitting || !session) return;
        
        const userMessage = chatInput;
        setIsSubmitting(true);
        setChatMessages(prev => [...prev, { from: 'user', text: userMessage }]);
        setChatInput('');

        // Mock AI response
        setTimeout(() => {
            const botResponse = `I understand you're asking about "${userMessage}". This AI feature is temporarily disabled, but a support ticket has been logged. Our team will get back to you shortly.`;
            setChatMessages(prev => [...prev, { from: 'support', text: botResponse }]);
            setIsSubmitting(false);
        }, 1000);
    }
    
    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="animate-fade-in pl-16">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <LifeBuoy className="w-8 h-8 text-primary" /> 
                    Help & Support
                </h2>
                <p className="text-muted-foreground">We're here to help you with any issues.</p>
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

                    if (topic.isDialog) {
                        return (
                             <Dialog key={topic.title}>
                                <DialogTrigger asChild>
                                    <div className="cursor-pointer h-full">{cardContent}</div>
                                </DialogTrigger>
                                <DialogContent className="max-w-md w-full flex flex-col h-[70vh]">
                                    <DialogHeader>
                                        <DialogTitle>AI Support Bot</DialogTitle>
                                        <DialogDescription>Ask me anything about rides, payments, or app features.</DialogDescription>
                                    </DialogHeader>
                                    <div className="flex-1 overflow-y-auto p-4 bg-muted/50 rounded-lg space-y-4">
                                        {chatMessages.map((msg, index) => (
                                            <div key={index} className={`flex items-end gap-2 ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                {msg.from === 'support' && (
                                                    <Avatar className="w-8 h-8">
                                                        <AvatarImage src="/avatars/01.png" alt="Support" data-ai-hint="support avatar" />
                                                        <AvatarFallback>AI</AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <div className={`max-w-[75%] p-3 rounded-2xl ${msg.from === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-background border rounded-bl-none'}`}>
                                                    <p className="text-sm">{msg.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 border-t pt-4">
                                        <Input 
                                            placeholder="Type your message..."
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                            disabled={isSubmitting}
                                        />
                                        <Button onClick={handleSendMessage} disabled={isSubmitting}>
                                            {isSubmitting ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )
                    }

                    return <div key={topic.title} onClick={() => handleActionClick(topic.action)}>{cardContent}</div>
                })}
            </div>
        </div>
    )
}
