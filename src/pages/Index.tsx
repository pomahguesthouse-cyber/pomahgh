import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import OptimizedHero from "@/components/OptimizedHero";
import { Welcome } from "@/components/Welcome";
import { GoogleRating } from "@/components/GoogleRating";
import { Rooms } from "@/components/Rooms";
import { Amenities } from "@/components/Amenities";
import { Location } from "@/components/Location";
import { NewsEvents } from "@/components/NewsEvents";
import { Footer } from "@/components/Footer";
import ChatbotWidget from "@/components/ChatbotWidget";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";

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
        <GoogleRating />
        <Rooms />
        <Amenities />
        <Location />
        <NewsEvents />
      </main>
      <Footer />
      <ChatbotWidget />
      <FloatingWhatsApp />
    </div>
  );
};

export default Index;