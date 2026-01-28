import { useEffect, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import OptimizedHero from "@/components/OptimizedHero";
import { Welcome } from "@/components/Welcome";
import { Footer } from "@/components/Footer";
import { 
  LazySection, 
  LazyGoogleRating, 
  LazyRooms, 
  LazyAmenities, 
  LazyLocation, 
  LazyNewsEvents,
  LazyChatbotSection 
} from "@/components/LazyComponents";

const Index = () => {
  const location = useLocation();

  // Handle hash navigation from other pages
  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.replace('#', ''));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <OptimizedHero />
        <Welcome />
        <LazySection fallbackHeight="h-32">
          <LazyGoogleRating />
        </LazySection>
        <LazySection fallbackHeight="h-[600px]">
          <LazyRooms />
        </LazySection>
        <LazySection fallbackHeight="h-96">
          <LazyAmenities />
        </LazySection>
        <LazySection fallbackHeight="h-96">
          <LazyLocation />
        </LazySection>
        <LazySection fallbackHeight="h-96">
          <LazyNewsEvents />
        </LazySection>
      </main>
      <Footer />
      <LazyChatbotSection />
    </div>
  );
};

export default Index;