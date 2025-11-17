'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { type Expense } from '../hooks/useExpenses'

interface ExpenseTableProps {
    expenses: Expense[];
    isLoading: boolean;
    totalExpenses: number;
}

export function ExpenseTable({ expenses, isLoading, totalExpenses }: ExpenseTableProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Expense Ledger</CardTitle>
                        <CardDescription>List of all company expenses in real-time.</CardDescription>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Expenses</p>
                        <p className="text-xl font-bold">₹{totalExpenses.toLocaleString()}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                              <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                              </TableRow>
                            ))
                        ) : expenses.length > 0 ? (
                            expenses.map(exp => (
                                 <TableRow key={exp.id}>
                                    <TableCell>{exp.date}</TableCell>
                                    <TableCell><Badge variant="secondary">{exp.category}</Badge></TableCell>
                                    <TableCell className="font-medium">{exp.description}</TableCell>
                                    <TableCell className="text-right font-medium text-destructive">-₹{exp.amount.toLocaleString()}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                    No expenses added yet. Use the form above to add a new expense.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
