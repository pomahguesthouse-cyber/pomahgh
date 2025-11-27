import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Html } from "@react-three/drei";
import { Suspense, useState, useEffect, Component, ReactNode } from "react";
import { useBuilding3DSettings } from "@/hooks/useBuilding3DSettings";
import { Skeleton } from "./ui/skeleton";
import { Loader2 } from "lucide-react";

interface Building3DViewerProps {
  hideHeader?: boolean;
}

// Error Boundary for 3D model loading
class ErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("3D Model loading error:", error);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

const HotelModel = ({ 
  url, 
  position, 
  rotation, 
  scale 
}: { 
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}) => {
  const { scene } = useGLTF(url);
  return (
    <primitive 
      object={scene} 
      position={position}
      rotation={rotation.map(deg => (deg * Math.PI) / 180) as [number, number, number]}
      scale={scale} 
    />
  );
};

const PlaceholderBuilding = ({ 
  position, 
  rotation, 
  scale 
}: { 
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}) => {
  return (
    <group 
      position={position}
      rotation={rotation.map(deg => (deg * Math.PI) / 180) as [number, number, number]}
      scale={scale}
    >
      {/* Base building */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[3, 2, 2]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Roof */}
      <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.5, 1, 4]} />
        <meshStandardMaterial color="#D2691E" />
      </mesh>

      {/* Windows - front */}
      <mesh position={[0.8, 1.2, 1.01]}>
        <boxGeometry args={[0.3, 0.4, 0.02]} />
        <meshStandardMaterial color="#87CEEB" />
      </mesh>
      <mesh position={[0, 1.2, 1.01]}>
        <boxGeometry args={[0.3, 0.4, 0.02]} />
        <meshStandardMaterial color="#87CEEB" />
      </mesh>
      <mesh position={[-0.8, 1.2, 1.01]}>
        <boxGeometry args={[0.3, 0.4, 0.02]} />
        <meshStandardMaterial color="#87CEEB" />
      </mesh>

      {/* Door */}
      <mesh position={[0, 0.5, 1.01]}>
        <boxGeometry args={[0.5, 1, 0.02]} />
        <meshStandardMaterial color="#654321" />
      </mesh>

      {/* Side windows */}
      <mesh position={[1.51, 1.2, 0]}>
        <boxGeometry args={[0.02, 0.4, 0.3]} />
        <meshStandardMaterial color="#87CEEB" />
      </mesh>
      <mesh position={[-1.51, 1.2, 0]}>
        <boxGeometry args={[0.02, 0.4, 0.3]} />
        <meshStandardMaterial color="#87CEEB" />
      </mesh>
    </group>
  );
};

const LoadingFallback = () => {
  return (
    <>
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#666" wireframe />
      </mesh>
      <Html center>
        <div className="flex flex-col items-center gap-2 text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading 3D Model...</p>
        </div>
      </Html>
    </>
  );
};

export const Building3DViewer = ({ hideHeader = false }: Building3DViewerProps = {}) => {
  const { data: settings, isLoading } = useBuilding3DSettings();
  const [modelError, setModelError] = useState(false);

  // Reset error state when model URL changes
  useEffect(() => {
    setModelError(false);
  }, [settings?.model_url]);

  if (isLoading) {
    return (
      <section className="py-16 px-4 bg-gradient-to-b from-background to-muted">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <Skeleton className="h-[400px] md:h-[500px] w-full rounded-2xl" />
        </div>
      </section>
    );
  }

  if (!settings?.show_section || !settings?.is_active) {
    return null;
  }

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto">
        {/* Header */}
        {!hideHeader && (
          <div className="text-center mb-8 animate-fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {settings.title}
            </h2>
            <p className="text-muted-foreground text-lg">
              {settings.subtitle}
            </p>
          </div>
        )}

        {/* 3D Canvas */}
        <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
          <Canvas
            camera={{
              position: [
                settings.camera_position_x,
                settings.camera_position_y,
                settings.camera_position_z,
              ],
              fov: 50,
            }}
            style={{ background: settings.background_color }}
          >
            <Suspense fallback={<LoadingFallback />}>
              {/* Lighting */}
              <ambientLight intensity={settings.ambient_light_intensity} />
              <directionalLight
                position={[10, 10, 5]}
                intensity={settings.directional_light_intensity}
                castShadow
              />
              <pointLight position={[-10, 10, -5]} intensity={0.5} />

              {/* Model - wrapped in additional Suspense with error handling */}
              {settings.model_url && settings.model_type === "uploaded" && !modelError ? (
                <Suspense fallback={<LoadingFallback />}>
                  <ErrorBoundary onError={() => setModelError(true)}>
                    <HotelModel 
                      url={settings.model_url}
                      position={[
                        settings.model_position_x || 0,
                        settings.model_position_y || 0,
                        settings.model_position_z || 0,
                      ]}
                      rotation={[
                        settings.model_rotation_x || 0,
                        settings.model_rotation_y || 0,
                        settings.model_rotation_z || 0,
                      ]}
                      scale={settings.model_scale || 1.5}
                    />
                  </ErrorBoundary>
                </Suspense>
              ) : (
                <PlaceholderBuilding 
                  position={[
                    settings.model_position_x || 0,
                    settings.model_position_y || 0,
                    settings.model_position_z || 0,
                  ]}
                  rotation={[
                    settings.model_rotation_x || 0,
                    settings.model_rotation_y || 0,
                    settings.model_rotation_z || 0,
                  ]}
                  scale={settings.model_scale || 1.5}
                />
              )}

              {/* Controls */}
              <OrbitControls
                autoRotate={settings.enable_auto_rotate}
                autoRotateSpeed={settings.auto_rotate_speed}
                enableZoom={settings.enable_zoom}
                minDistance={settings.min_zoom}
                maxDistance={settings.max_zoom}
                enablePan={false}
                maxPolarAngle={Math.PI / 2}
              />

              {/* Environment for realistic lighting */}
              <Environment preset="city" />
            </Suspense>
          </Canvas>

          {/* Control hints overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm text-white px-6 py-3 rounded-full text-sm font-medium shadow-lg">
              🖱️ Drag untuk memutar • Scroll untuk zoom
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
