
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Gift, Ticket, Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const offers = [
    {
        code: 'CABZI50',
        title: 'Flat ₹50 OFF',
        description: 'Get a flat discount of ₹50 on your next ride. Valid for all users.',
        expiry: 'Expires on: 31st Oct, 2024'
    },
    {
        code: 'FIRSTCAB',
        title: '50% OFF on First Ride',
        description: 'New to Cabzi? Enjoy 50% off (up to ₹75) on your very first ride with us.',
        expiry: 'Expires on: 31st Dec, 2024'
    },
    {
        code: 'WORKRIDE',
        title: '20% OFF on Prime Rides',
        description: 'Get 20% off on all Cab (Prime) rides between 9 AM and 6 PM on weekdays.',
        expiry: 'Expires on: 15th Nov, 2024'
    },
    {
        code: 'AIRPORT100',
        title: 'Flat ₹100 OFF on Airport Rides',
        description: 'Get a flat discount of ₹100 on rides to or from the airport.',
        expiry: 'Expires on: 30th Nov, 2024'
    }
]

export default function RiderOffersPage() {
    const { toast } = useToast();

    const handleCopyCode = async (code: string) => {
        try {
            // The Clipboard API can be blocked in insecure contexts or by browser policy.
            // A try-catch block provides a graceful fallback.
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(code);
                toast({
                    title: 'Code Copied!',
                    description: `Promo code ${code} has been copied to your clipboard.`,
                    className: 'bg-green-600 text-white border-green-600'
                });
            } else {
                 throw new Error('Clipboard API not available');
            }
        } catch (err) {
            console.error('Failed to copy: ', err);
            // Fallback for browsers that block clipboard API or in non-secure contexts.
            toast({
                title: 'Here is your code:',
                description: code,
            });
        }
    }
    
    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="animate-fade-in">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Gift className="w-8 h-8 text-primary" /> 
                    Offers & Promos
                </h2>
                <p className="text-muted-foreground">Your exclusive deals to save more on every ride.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                {offers.map(offer => (
                    <Card key={offer.code} className="bg-muted/30">
                        <CardHeader className="flex-row items-start gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Ticket className="w-6 h-6 text-primary"/>
                            </div>
                            <div className="flex-1">
                                <CardTitle>{offer.title}</CardTitle>
                                <CardDescription>{offer.description}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center justify-between p-3 rounded-lg bg-background border-2 border-dashed">
                                <div>
                                    <p className="text-xs text-muted-foreground">Promo Code</p>
                                    <p className="text-lg font-bold font-mono tracking-widest">{offer.code}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleCopyCode(offer.code)}>
                                    <Copy className="w-5 h-5 text-muted-foreground" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center mt-3">{offer.expiry}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

    