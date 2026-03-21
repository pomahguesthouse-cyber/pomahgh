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
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-background">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold truncate">{value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
