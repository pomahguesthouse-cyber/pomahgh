import { lazy, Suspense, createElement, type ComponentType, type LazyExoticComponent } from "react";
import { Circle, type LucideIcon, type LucideProps } from "lucide-react";

/**
 * Dynamically load a single Lucide icon by name.
 *
 * Importing the full `icons` map from `lucide-react` pulls every icon into the
 * bundle (~600 KB). Instead, we use `React.lazy` with a per-icon dynamic
 * import, so only icons actually rendered are downloaded.
 *
 * Lucide ships individual icon files at `lucide-react/dist/esm/icons/<kebab>.js`.
 * Names in our DB are typically PascalCase (e.g. "MapPin"), so we convert them
 * to kebab-case ("map-pin") before requesting the chunk.
 */

const pascalToKebab = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

type LazyIcon = LazyExoticComponent<ComponentType<LucideProps>>;

const componentCache = new Map<string, LazyIcon>();

const loadIcon = (kebabName: string): LazyIcon =>
  lazy(async () => {
    try {
      const mod = await import(
        /* @vite-ignore */
        `lucide-react/dist/esm/icons/${kebabName}.js`
      );
      // Lucide icon modules export the icon as the default export.
      const Resolved = (mod.default ?? mod[kebabName]) as ComponentType<LucideProps>;
      return { default: Resolved };
    } catch {
      return { default: Circle as unknown as ComponentType<LucideProps> };
    }
  });

const getCachedIcon = (kebabName: string): LazyIcon => {
  const cached = componentCache.get(kebabName);
  if (cached) return cached;
  const created = loadIcon(kebabName);
  componentCache.set(kebabName, created);
  return created;
};

interface DynamicIconProps extends LucideProps {
  name: string;
  fallback?: LucideIcon;
}

/**
 * Render a Lucide icon by name, lazy-loading only that icon's chunk.
 *
 * Uses `createElement` rather than JSX so we can interop between the
 * `LazyExoticComponent` returned by `React.lazy` and the
 * `ForwardRefExoticComponent` ref signature exported by lucide-react
 * without TS complaining about the LegacyRef vs RefObject mismatch.
 */
export const DynamicIcon = ({ name, fallback, ...props }: DynamicIconProps) => {
  const FallbackComp = (fallback ?? Circle) as unknown as ComponentType<LucideProps>;
  if (!name) return createElement(FallbackComp, props);
  const kebab = pascalToKebab(name);
  const LazyIconComp = getCachedIcon(kebab) as unknown as ComponentType<LucideProps>;
  return createElement(
    Suspense,
    { fallback: createElement(FallbackComp, props) },
    createElement(LazyIconComp, props)
  );
};

/**
 * Backwards-compatible helper that returns a component renderable like
 * `const Icon = getIconByName(name); <Icon className="..." />`.
 *
 * Internally uses the same lazy loading pipeline so no icon is ever bundled
 * eagerly. Callers do not need to change.
 */
export const getIconByName = (
  iconName: string,
  fallback: LucideIcon = Circle
): ComponentType<LucideProps> => {
  const FallbackTyped = fallback as unknown as ComponentType<LucideProps>;
  if (!iconName) return FallbackTyped;
  const kebab = pascalToKebab(iconName);
  const LazyIconComp = getCachedIcon(kebab) as unknown as ComponentType<LucideProps>;
  const Wrapped: ComponentType<LucideProps> = (props) =>
    createElement(
      Suspense,
      { fallback: createElement(FallbackTyped, props) },
      createElement(LazyIconComp, props)
    );
  Wrapped.displayName = `DynamicIcon(${iconName})`;
  return Wrapped;
};
