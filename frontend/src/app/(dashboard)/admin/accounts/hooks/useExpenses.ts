
'use client'

import { useState, useEffect, useCallback } from 'react';
import { useDb } from '@/lib/firebase/client-provider';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export type ExpenseCategory = 'Salary' | 'Office Rent' | 'Marketing' | 'Tech Infrastructure' | 'Travel' | 'Legal & Compliance' | 'Vendor Payout' | 'Other';

export interface Expense {
    id: string;
    category: ExpenseCategory;
    description: string;
    amount: number;
    date: string;
    createdAt: Timestamp;
}

export function useExpenses() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const db = useDb();

    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
        }, (error) => {
            console.error("Error fetching expenses: ", error);
            toast.error('Error', { description: 'Failed to fetch real-time expense data.' });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    const addExpense = useCallback(async (newExpense: Omit<Expense, 'id' | 'date' | 'createdAt'>) => {
        if (!db) {
            toast.error('Database Error');
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "expenses"), {
                ...newExpense,
                createdAt: Timestamp.now(),
            });
            toast.success('Expense Added', {
                description: `${newExpense.description} (₹${newExpense.amount}) has been added.`,
            });
        } catch (error) {
            console.error("Error adding expense: ", error);
            toast.error('Error', { description: 'Could not add expense.' });
        } finally {
            setIsSubmitting(false);
        }
    }, [db]);

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return { expenses, isLoading, isSubmitting, addExpense, totalExpenses };
}
