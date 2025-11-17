
'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Landmark, Wallet, IndianRupee, TrendingUp, TrendingDown, Percent } from 'lucide-react'

// Mock Data for the Curocity Bank page
const bankStats = {
  totalFloat: 4850230, // Total money in all partner wallets
  totalLoansDisbursed: 1250000,
  totalRepaid: 850000,
  netInterestMargin: 62500, // Profit from interest
}

const partnerWallets = [
  { id: 'CZP-0001', name: 'Rakesh Sharma', walletBalance: 1250.75, loanAmount: 5000, loanStatus: 'Active' },
  { id: 'CZP-0002', name: 'Sunita Gupta', walletBalance: 4500.00, loanAmount: 0, loanStatus: 'N/A' },
  { id: 'CZR-0003', name: 'Alok Nath (Mechanic)', walletBalance: 8200.50, loanAmount: 15000, loanStatus: 'Active' },
  { id: 'CZP-0004', name: 'Priya Singh', walletBalance: 250.00, loanAmount: 2000, loanStatus: 'Overdue' },
  { id: 'CZP-0005', name: 'Amit Kumar', walletBalance: 6780.25, loanAmount: 10000, loanStatus: 'Paid' },
  { id: 'CZR-0006', name: 'Vijay’s Garage', walletBalance: 15300.00, loanAmount: 50000, loanStatus: 'Active' },
]

const getStatusBadge = (status: 'Active' | 'Paid' | 'N/A' | 'Overdue') => {
    switch (status) {
        case 'Active': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">{status}</Badge>;
        case 'Paid': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">{status}</Badge>;
        case 'Overdue': return <Badge variant="destructive">{status}</Badge>;
        case 'N/A':
        default: return <Badge variant="secondary">{status}</Badge>;
    }
}


export default function BankPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Landmark className="w-8 h-8 text-primary"/>
            Curocity Bank
          </h1>
          <p className="text-muted-foreground">
            Financial overview of the partner ecosystem.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wallet Float</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{bankStats.totalFloat.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total balance across all partner wallets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loans Disbursed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{bankStats.totalLoansDisbursed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total amount loaned to partners</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loans Repaid</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{bankStats.totalRepaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total principal amount recovered</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Interest Margin</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+₹{bankStats.netInterestMargin.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Profit earned from lending activities</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partner Wallet &amp; Loan Overview</CardTitle>
          <CardDescription>
            A real-time snapshot of all partner financial accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead className="text-right">Wallet Balance</TableHead>
                <TableHead>Loan Status</TableHead>
                <TableHead className="text-right">Loan Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerWallets.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell>
                    <div className="font-medium">{partner.name}</div>
                    <div className="text-xs text-muted-foreground">{partner.id}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono">₹{partner.walletBalance.toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(partner.loanStatus as any)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {partner.loanAmount > 0 ? `₹${partner.loanAmount.toLocaleString()}` : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
