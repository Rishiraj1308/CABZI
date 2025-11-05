'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { PlusCircle } from 'lucide-react'
import { useDb } from '@/firebase/client-provider'
import { collection, addDoc, getDocs, orderBy, query, Timestamp } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'

type ExpenseCategory = 'Salary' | 'Office Rent' | 'Marketing' | 'Tech Infrastructure' | 'Travel' | 'Legal & Compliance' | 'Vendor Payout' | 'Other';

interface Expense {
    id: string;
    category: ExpenseCategory;
    description: string;
    amount: number;
    date: string;
    createdAt: Timestamp;
}

export default function AccountsPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [category, setCategory] = useState<ExpenseCategory | ''>('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const db = useDb();

    const fetchExpenses = async () => {
        if (!db) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const expensesData: Expense[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            expensesData.push({
                id: doc.id,
                ...data,
                date: data.createdAt.toDate().toLocaleDateString('en-CA'),
            } as Expense);
        });
        setExpenses(expensesData);
        setIsLoading(false);
    }

    useEffect(() => {
        fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!category || !description || !amount) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all fields.' });
            return;
        }
        if (!db) {
            toast({ variant: 'destructive', title: 'Database Error', description: 'Could not connect to Firestore.' });
            return;
        }

        try {
            await addDoc(collection(db, "expenses"), {
                category: category as ExpenseCategory,
                description,
                amount: parseFloat(amount),
                createdAt: Timestamp.now(),
            });

            toast({
                title: 'Expense Added',
                description: `${description} (₹${amount}) has been added to the ledger.`,
            });

            setCategory('');
            setDescription('');
            setAmount('');
            fetchExpenses(); // Re-fetch expenses after adding a new one
        } catch (error) {
            console.error("Error adding expense: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not add expense.' });
        }
    }

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Accounts Panel</CardTitle>
          <CardDescription>
            Add all company expenses here. This data will be reflected in the main Audit Report.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="category">Expense Category</Label>
                        <Select value={category} onValueChange={(value) => setCategory(value as ExpenseCategory)}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Salary">Salary</SelectItem>
                                <SelectItem value="Office Rent">Office Rent</SelectItem>
                                <SelectItem value="Marketing">Marketing</SelectItem>
                                <SelectItem value="Tech Infrastructure">Tech Infrastructure</SelectItem>
                                <SelectItem value="Travel">Travel</SelectItem>
                                <SelectItem value="Legal & Compliance">Legal & Compliance</SelectItem>
                                <SelectItem value="Vendor Payout">Vendor Payout</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input 
                            id="description" 
                            placeholder="e.g., May office rent" 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="amount">Amount (INR)</Label>
                        <Input 
                            id="amount" 
                            type="number" 
                            placeholder="e.g., 50000"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                     </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button type="submit">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Expense to Ledger
                 </Button>
            </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Expense Ledger</CardTitle>
                    <CardDescription>List of recently added expenses from the database.</CardDescription>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Added</p>
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
    </div>
  )
}
