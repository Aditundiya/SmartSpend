
'use client';

import type { Expense } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns'; // Using format directly

interface ExportButtonProps {
  expenses: Expense[];
  filename: string;
  categoryMap: Map<string, string>;
}

export default function ExportButton({ expenses, filename, categoryMap }: ExportButtonProps) {
  const convertToCSV = (data: Expense[]): string => {
    const headers = ['Date', 'Description', 'Category', 'Amount'];
    const rows = data.map(expense => {
      const categoryName = categoryMap.get(expense.categoryId) || 'N/A';
      // Escape double quotes within description and category name by doubling them
      const escapeCSVField = (field: string) => `"${field.replace(/"/g, '""')}"`;
      
      return [
        format(expense.date, 'yyyy-MM-dd'), // Using format from date-fns
        escapeCSVField(expense.description),
        escapeCSVField(categoryName),
        expense.amount.toFixed(2)
      ].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  };

  const handleExport = () => {
    if (expenses.length === 0) {
      // Button is disabled by parent or this component, but good to have a check
      console.log("No data to export.");
      return;
    }
    const csvData = convertToCSV(expenses);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Check for download attribute support (common in modern browsers)
    if (link.download !== undefined) { 
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Fallback for older browsers
      const navigatorAlias = window.navigator as any;
      if (navigatorAlias.msSaveOrOpenBlob) {
        navigatorAlias.msSaveOrOpenBlob(blob, filename);
      } else {
        // General fallback: Open in new window/tab
        const url = URL.createObjectURL(blob);
        window.open(url);
        URL.revokeObjectURL(url); // Clean up
      }
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleExport} 
      disabled={expenses.length === 0}
    >
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
