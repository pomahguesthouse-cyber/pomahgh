import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Shared styling primitives for booking dialogs (Create / Edit).
 * Keep visual styling consistent in one place — do not duplicate classes.
 */

export const SectionCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("bg-muted/40 border rounded-2xl p-5 space-y-4", className)}
    {...props}
  />
));
SectionCard.displayName = "SectionCard";

export const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label
    ref={ref}
    className={cn(
      "font-bold text-xs uppercase tracking-[0.15em] text-muted-foreground font-sans",
      className
    )}
    {...props}
  />
));
FieldLabel.displayName = "FieldLabel";

export const FieldInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof Input>
>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={cn("mt-1 rounded-xl h-11 font-medium", className)}
    {...props}
  />
));
FieldInput.displayName = "FieldInput";