'use client'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useExpenses } from './hooks/useExpenses'
import { ExpenseForm } from './components/expense-form'
import { ExpenseTable } from './components/expense-table'

export default function AccountsPage() {
    const { expenses, isLoading, isSubmitting, addExpense, totalExpenses } = useExpenses();

    return (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Panel</CardTitle>
              <CardDescription>
                Add all company expenses here. This data will be reflected in the main Audit Report.
              </CardDescription>
            </CardHeader>
            <ExpenseForm addExpense={addExpense} isSubmitting={isSubmitting} />
          </Card>
    
          <ExpenseTable expenses={expenses} isLoading={isLoading} totalExpenses={totalExpenses} />
        </div>
      )
}
