
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { PlusCircle, Loader2 } from 'lucide-react'
import { type ExpenseCategory } from '../hooks/useExpenses'
import { CardContent, CardFooter } from '@/components/ui/card'

interface ExpenseFormProps {
    addExpense: (expense: { category: ExpenseCategory; description: string; amount: number; }) => Promise<void>;
    isSubmitting: boolean;
}

export function ExpenseForm({ addExpense, isSubmitting }: ExpenseFormProps) {
    const [category, setCategory] = useState<ExpenseCategory | ''>('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!category || !description || !amount) {
            toast.error('Error', { description: 'Please fill all fields.' });
            return;
        }

        await addExpense({
            category: category as ExpenseCategory,
            description,
            amount: parseFloat(amount),
        });

        setCategory('');
        setDescription('');
        setAmount('');
    }

    return (
        <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="category">Expense Category</Label>
                        <Select value={category} onValueChange={(value) => setCategory(value as ExpenseCategory)} disabled={isSubmitting}>
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
                            disabled={isSubmitting}
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
                            disabled={isSubmitting}
                        />
                     </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Add Expense
                 </Button>
            </CardFooter>
        </form>
    );
}
