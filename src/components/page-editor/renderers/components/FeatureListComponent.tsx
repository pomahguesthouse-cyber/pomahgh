import React from 'react';
import { PageComponent } from '@/types/page-editor';
import { MapPin, Wallet, Check, Star, Wifi, Car } from 'lucide-react';

interface Props {
  component: PageComponent;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MapPin,
  Wallet,
  Check,
  Star,
  Wifi,
  Car,
};

export function FeatureListComponent({ component }: Props) {
  const items = component.content.items || [];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item, index) => {
        const Icon = iconMap[item.icon || 'Check'] || Check;
        return (
          <div key={index} className="flex gap-3 p-4 rounded-lg bg-muted/50">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
