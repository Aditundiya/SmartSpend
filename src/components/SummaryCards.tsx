
import type { Expense } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Landmark } from 'lucide-react';

interface SummaryCardsProps {
  expenses: Expense[];
  totalManualIncomes: number; // Sum of manually logged incomes
  calculatedRecurringIncome: number; // Calculated recurring income
}

import { useCurrency } from '@/hooks/use-currency';

// ...

export default function SummaryCards({ expenses, totalManualIncomes, calculatedRecurringIncome }: SummaryCardsProps) {
  const { format: formatCurrency } = useCurrency();
  const totalSpending = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalIncomeThisMonth = totalManualIncomes + calculatedRecurringIncome;
  const netBalance = totalIncomeThisMonth - totalSpending;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Total Spending Card */}
      <Card className="relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group border-l-4 border-l-destructive">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold tracking-tight">Total Spending</CardTitle>
          <div className="p-2 bg-red-100 rounded-lg group-hover:scale-110 transition-transform duration-200">
            <DollarSign className="h-5 w-5 text-red-600" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(totalSpending)}</div>
          <p className="text-sm text-muted-foreground">Total amount spent this period</p>
          {totalSpending > 0 && (
            <div className="mt-3 h-2 bg-red-100 rounded-full overflow-hidden">
              <div className="h-full bg-red-400 rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Income Card */}
      <Card className="relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group border-l-4 border-l-accent">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold tracking-tight">Total Income</CardTitle>
          <div className="p-2 bg-green-100 rounded-lg group-hover:scale-110 transition-transform duration-200">
            <Landmark className="h-5 w-5 text-green-600" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold text-green-600 mb-1">{formatCurrency(totalIncomeThisMonth)}</div>
          <p className="text-sm text-muted-foreground">Recurring & logged income</p>
          {totalIncomeThisMonth > 0 && (
            <div className="mt-3 h-2 bg-green-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Net Balance Card */}
      <Card className={`relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group border-l-4 ${netBalance >= 0 ? 'border-l-accent' : 'border-l-destructive'
        }`}>
        <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${netBalance >= 0 ? 'from-green-50/50' : 'from-red-50/50'
          } to-transparent`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold tracking-tight">Net Balance</CardTitle>
          <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform duration-200 ${netBalance >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
            {netBalance >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className={`text-3xl font-bold mb-1 ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
            {formatCurrency(netBalance)}
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {netBalance >= 0 ? 'Income exceeds expenses' : 'Expenses exceed income'}
          </p>
          {/* Progress bar for savings rate */}
          {totalIncomeThisMonth > 0 && (
            <div className="mt-3">
              <div className={`h-2 rounded-full overflow-hidden ${netBalance >= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${netBalance >= 0 ? 'bg-green-400' : 'bg-red-400'
                    }`}
                  style={{
                    width: `${Math.min(100, Math.abs((netBalance / totalIncomeThisMonth) * 100))}%`
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {netBalance >= 0 ? 'Savings' : 'Deficit'}: {Math.abs((netBalance / totalIncomeThisMonth) * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
