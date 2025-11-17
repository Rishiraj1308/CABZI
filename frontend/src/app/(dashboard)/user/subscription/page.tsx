
'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Gift, Crown } from 'lucide-react'

const subscriptionPlans = [
    {
        name: 'Curocity Plus',
        price: '₹99',
        period: '/month',
        features: [
            'Priority customer support',
            '5% discount on all Cab rides',
            'Advanced safety features',
            'Early access to new services',
        ],
        isCurrent: false,
    },
    {
        name: 'Curocity Premium',
        price: '₹299',
        period: '/month',
        features: [
            'All Plus features',
            '10% discount on all ride types',
            'Free cancellation on 2 rides per month',
            'Dedicated support line',
            'Complimentary airport lounge access (1/quarter)',
        ],
        isCurrent: true,
    }
]

export default function SubscriptionPage() {
  return (
    <div className="container mx-auto max-w-4xl py-8">
        <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Gift className="w-8 h-8 text-primary" />
                My Subscription
            </h2>
            <p className="text-muted-foreground">Manage your Curocity membership plan.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subscriptionPlans.map(plan => (
                <Card key={plan.name} className={plan.isCurrent ? 'ring-2 ring-primary border-primary' : ''}>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                {plan.name === 'Curocity Premium' && <Crown className="w-6 h-6 text-amber-500" />}
                                {plan.name}
                            </CardTitle>
                            {plan.isCurrent && (
                                <div className="px-3 py-1 text-xs font-semibold rounded-full bg-primary text-primary-foreground">Current Plan</div>
                            )}
                        </div>
                        <div className="flex items-baseline pt-2">
                             <span className="text-4xl font-bold">{plan.price}</span>
                             <span className="text-muted-foreground">{plan.period}</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {plan.features.map(feature => (
                                <li key={feature} className="flex items-start">
                                    <Check className="w-5 h-5 text-green-500 mr-2 mt-0.5 shrink-0" />
                                    <span className="text-sm text-muted-foreground">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" disabled={plan.isCurrent}>
                            {plan.isCurrent ? 'Currently Subscribed' : 'Upgrade Plan'}
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    </div>
  )
}
