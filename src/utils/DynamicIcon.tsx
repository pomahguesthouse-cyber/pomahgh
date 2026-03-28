import { icons } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Get a Lucide icon component by name string.
 * Uses the tree-shakeable `icons` map from lucide-react.
 * This avoids `import * as Icons` which pulls the entire library.
 */
export const getIconByName = (
  iconName: string,
  fallback: LucideIcon = icons.Circle as unknown as LucideIcon
): LucideIcon => {
  const Icon = icons[iconName as keyof typeof icons];
  return (Icon as unknown as LucideIcon) || fallback;
};
