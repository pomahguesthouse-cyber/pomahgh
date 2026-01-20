import { Card, CardContent } from '@/components/ui/card';
import type { StatCardProps } from '../types';

const variantClasses = {
  default: 'bg-card border',
  success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
  warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
  destructive: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
};

export const StatCard = ({ title, value, icon: Icon, variant = 'default' }: StatCardProps) => {
  return (
    <Card className={variantClasses[variant]}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-background">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};












