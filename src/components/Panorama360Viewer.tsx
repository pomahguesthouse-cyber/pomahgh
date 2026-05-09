import { lazy, Suspense } from "react";
import type { Panorama360ViewerProps } from "./Panorama360ViewerImpl";

/**
 * Lazy wrapper for Panorama360Viewer.
 * The actual implementation imports `pannellum-react` (~679 KB).
 * We dynamically import it so the heavy library is only fetched on
 * routes that actually render a 360° viewer.
 */
const Panorama360ViewerLazy = lazy(() => import("./Panorama360ViewerImpl"));

const ViewerFallback = ({ height = "400px" }: { height?: string }) => (
  <div
    className="rounded-lg bg-muted/40 flex items-center justify-center text-sm text-muted-foreground"
    style={{ height }}
  >
    Memuat tur 360°...
  </div>
);

export const Panorama360Viewer = (props: Panorama360ViewerProps) => (
  <Suspense fallback={<ViewerFallback height={props.height} />}>
    <Panorama360ViewerLazy {...props} />
  </Suspense>
);
