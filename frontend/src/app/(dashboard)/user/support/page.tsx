
'use client'

import React, { useState, useEffect } from 'react'
import { LifeBuoy, FileText, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useFirebase } from '@/lib/firebase/client-provider'
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { ClientSession } from '@/lib/types'

interface SupportTicket {
  id: string;
  ticketId: string;
  query: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  createdAt: Timestamp;
  userType: 'rider' | 'partner';
}

const faqs = [
  {
    question: "How is my fare calculated?",
    answer: "Fares are calculated based on the distance of the trip, the time it takes, and the base fare for your chosen vehicle type. We do not use surge pricing, ensuring fair and transparent costs."
  },
  {
    question: "How do I cancel a ride?",
    answer: "You can cancel a ride from the ride status screen. Please note that a cancellation fee may apply if you cancel after a partner has been assigned."
  },
  {
    question: "What is Curocity Pink?",
    answer: "Curocity Pink is our women-only service, providing a safe and comfortable ride experience with women partners for our women riders."
  },
  {
    question: "My payment failed but money was deducted.",
    answer: "Don't worry. If your payment failed and the amount was deducted, it will be automatically refunded to your source account within 5-7 business days."
  }
];

export default function SupportPage() {
  const { db, user } = useFirebase();
  const [session, setSession] = useState<ClientSession | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [newQuery, setNewQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  useEffect(() => {
    const sessionData = localStorage.getItem('curocity-session');
    if (sessionData) {
      setSession(JSON.parse(sessionData));
    }
  }, []);

  useEffect(() => {
    if (!db || !session?.userId) {
      setIsLoadingTickets(false);
      return;
    };

    const q = query(
      collection(db, "supportQueries"),
      where("userId", "==", session.userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userTickets: SupportTicket[] = [];
      snapshot.forEach((doc) => {
        userTickets.push({ id: doc.id, ...doc.data() } as SupportTicket);
      });
      setTickets(userTickets);
      setIsLoadingTickets(false);
    }, (error) => {
      console.error("Error fetching support tickets:", error);
      toast.error("Error", { description: "Could not load your support tickets." });
      setIsLoadingTickets(false);
    });

    return () => unsubscribe();
  }, [db, session?.userId]);
  
  const handleSubmitQuery = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newQuery.trim() || !db || !session) {
          toast.error('Cannot Submit', { description: 'Please enter your query and ensure you are logged in.' });
          return;
      }
      setIsSubmitting(true);
      try {
          const ticketId = `TKT-${session.role === 'user' ? 'R' : 'P'}-${Date.now()}`;
          await addDoc(collection(db, 'supportQueries'), {
              userId: session.userId,
              customerName: session.name,
              customerPhone: session.phone,
              userType: session.role === 'user' ? 'rider' : 'partner',
              ticketId,
              query: newQuery,
              status: 'Pending',
              createdAt: serverTimestamp()
          });
          setNewQuery('');
          toast.success('Query Submitted!', { description: `Your ticket ID is ${ticketId}. Our team will get back to you shortly.` });
      } catch (error) {
          toast.error('Submission Failed', { description: 'There was an error submitting your query.' });
      } finally {
          setIsSubmitting(false);
      }
  }

  const getStatusBadge = (status: SupportTicket['status']) => {
    switch (status) {
      case 'Pending': return <Badge className="bg-yellow-100 text-yellow-800">{status}</Badge>;
      case 'In Progress': return <Badge className="bg-blue-100 text-blue-800">{status}</Badge>;
      case 'Resolved': return <Badge className="bg-green-100 text-green-800">{status}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <LifeBuoy className="w-8 h-8 text-primary" />
          Help & Support
        </h2>
        <p className="text-muted-foreground">Find answers or get in touch with our team.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
           <Card>
            <CardHeader>
              <CardTitle>Submit a New Query</CardTitle>
              <CardDescription>Can't find an answer? Let us know how we can help.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmitQuery}>
                <CardContent>
                    <Textarea 
                        placeholder="Describe your issue in detail..." 
                        rows={4}
                        value={newQuery}
                        onChange={(e) => setNewQuery(e.target.value)}
                        disabled={isSubmitting}
                    />
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting || !newQuery.trim()}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                        Submit Query
                    </Button>
                </CardFooter>
            </form>
          </Card>

          <Card>
             <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
             </CardHeader>
             <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {faqs.map(faq => (
                        <AccordionItem key={faq.question} value={faq.question}>
                            <AccordionTrigger>{faq.question}</AccordionTrigger>
                            <AccordionContent>{faq.answer}</AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
             </CardContent>
          </Card>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Your Tickets</h3>
          {isLoadingTickets ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : tickets.length > 0 ? (
            tickets.map(ticket => (
              <Card key={ticket.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-semibold text-primary">{ticket.ticketId}</p>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <p className="text-sm font-medium mt-1 line-clamp-2">{ticket.query}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(ticket.createdAt?.toDate()).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="h-32 flex items-center justify-center border-dashed">
                <p className="text-sm text-muted-foreground">You have no support tickets.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
