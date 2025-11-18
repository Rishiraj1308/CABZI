'use client'

import * as React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { IndianRupee, ArrowUpRight, ArrowDownLeft, PlusCircle, Send, QrCode } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import QrScanner from '@/components/ui/qr-scanner'

const mockTransactions = [
  { type: 'debit', amount: 312, description: 'Ride to IGI Airport', date: 'Today' },
  { type: 'credit', amount: 50, description: 'Cashback Reward', date: 'Yesterday' },
  { type: 'debit', amount: 157, description: 'Ride to Cyber Hub', date: 'Yesterday' },
  { type: 'credit', amount: 500, description: 'Added from UPI', date: '2 days ago' },
]

export default function WalletPage() {
    const [scannerOpen, setScannerOpen] = React.useState(false)

    const handleScanResult = (result: any, error: any) => {
        if (result) {
            setScannerOpen(false)
            toast.success("QR Code Scanned", {
                description: `Result: ${result?.text}`,
            })
        }
        if (error) {
            // console.info(error);
        }
    }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="animate-fade-in">
        <h2 className="text-3xl font-bold tracking-tight">My Wallet</h2>
        <p className="text-muted-foreground">
          Your central hub for all payments and transactions.
        </p>
      </div>

      <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-2xl">
        <CardHeader>
          <CardDescription className="text-primary-foreground/80">
            Available Balance
          </CardDescription>
          <CardTitle className="text-5xl font-bold flex items-center">
            <IndianRupee className="h-10 w-10" />
            <span>281.00</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="secondary" className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Money
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Money to Wallet</DialogTitle>
                        <DialogDescription>Enter the amount you want to add.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input type="number" placeholder="₹ Amount" className="text-lg h-12" />
                    </div>
                    <DialogFooter>
                        <Button onClick={() => toast.info("Coming Soon!", { description: "Live payment integration is on the way." })} className="w-full">Proceed to Add</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
             <Dialog>
                <DialogTrigger asChild>
                    <Button variant="secondary" className="w-full">
                        <Send className="mr-2 h-4 w-4" /> Send Money
                    </Button>
                </DialogTrigger>
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send Money</DialogTitle>
                        <DialogDescription>Enter UPI ID or scan QR to send money.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <Input placeholder="Enter UPI ID" className="text-base h-11" />
                        <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <QrCode className="mr-2 h-4 w-4" /> Scan QR Code
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm">
                                <DialogHeader>
                                    <DialogTitle>Scan & Pay</DialogTitle>
                                </DialogHeader>
                                <div className="aspect-square w-full rounded-lg overflow-hidden mt-4">
                                    <QrScanner onResult={handleScanResult} />
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => toast.info("Coming Soon!", { description: "Live payment integration is on the way." })} className="w-full">Verify & Proceed</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Here's a look at your recent wallet activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTransactions.map((tx, index) => (
              <React.Fragment key={index}>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center bg-muted">
                    {tx.type === 'debit' ? (
                      <ArrowUpRight className="h-5 w-5 text-destructive" />
                    ) : (
                      <ArrowDownLeft className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-semibold">{tx.description}</p>
                    <p className="text-sm text-muted-foreground">{tx.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.type === 'debit' ? 'text-destructive' : 'text-green-500'}`}>
                      {tx.type === 'debit' ? '-' : '+'}₹{tx.amount}
                    </p>
                  </div>
                </div>
                {index < mockTransactions.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
