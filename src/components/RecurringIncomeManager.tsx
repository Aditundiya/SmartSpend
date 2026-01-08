'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useCurrency } from '@/hooks/use-currency';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { RecurringIncomeTemplate } from '@/lib/recurring-income';

interface RecurringIncomeManagerProps {
  profileId: string;
  onRecurringIncomeChange?: () => void;
}

export default function RecurringIncomeManager({ profileId, onRecurringIncomeChange }: RecurringIncomeManagerProps) {
  const { format: formatCurrency } = useCurrency();
  const [templates, setTemplates] = useState<RecurringIncomeTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadTemplates = async () => {
    try {
      const { getActiveRecurringIncomeTemplates } = await import('@/lib/recurring-income');
      const activeTemplates = getActiveRecurringIncomeTemplates(profileId);
      setTemplates(activeTemplates);
    } catch (error) {
      console.error('Error loading recurring income templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [profileId]);

  const handleDeactivateTemplate = async (templateId: string, description: string) => {
    try {
      const { deactivateRecurringIncomeTemplate } = await import('@/lib/recurring-income');
      deactivateRecurringIncomeTemplate(templateId);

      toast({
        title: 'Recurring Income Stopped',
        description: `"${description}" will no longer generate automatic income records.`,
        className: 'bg-accent text-accent-foreground'
      });

      await loadTemplates();
      onRecurringIncomeChange?.();
    } catch (error) {
      console.error('Error deactivating template:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to stop recurring income. Please try again.',
      });
    }
  };

  const handleGenerateRecords = async (templateId: string) => {
    try {
      const { generateIncomeRecordsForTemplate, getRecurringIncomeTemplates } = await import('@/lib/recurring-income');
      const allTemplates = getRecurringIncomeTemplates();
      const template = allTemplates.find(t => t.id === templateId);

      if (template) {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        await generateIncomeRecordsForTemplate(template, futureDate);

        toast({
          title: 'Records Generated',
          description: 'Future income records have been generated successfully.',
          className: 'bg-accent text-accent-foreground'
        });

        onRecurringIncomeChange?.();
      }
    } catch (error) {
      console.error('Error generating records:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate income records. Please try again.',
      });
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'bg-green-100 text-green-800';
      case 'fortnightly': return 'bg-blue-100 text-blue-800';
      case 'monthly': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="h-5 w-5 mr-2" />
            Recurring Incomes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="h-5 w-5 mr-2" />
            Recurring Incomes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No recurring incomes set up. Add a weekly, fortnightly, or monthly income to see it here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <RefreshCw className="h-5 w-5 mr-2" />
          Recurring Incomes ({templates.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.map((template) => (
          <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium">{template.description}</h4>
                <Badge className={getFrequencyColor(template.frequency)}>
                  {template.frequency}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(template.amount)}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Started {format(template.startDate, 'MMM d, yyyy')}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateRecords(template.id)}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Generate
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Stop Recurring Income</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to stop "{template.description}"? This will prevent future automatic income records from being generated. Existing records will not be affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeactivateTemplate(template.id, template.description)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Stop Recurring Income
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}