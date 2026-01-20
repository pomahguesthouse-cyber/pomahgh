import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/hero/Hero";
import { Welcome } from "@/components/hero/Welcome";
import { GoogleRating } from "@/components/common/GoogleRating";
import { Rooms } from "@/components/Rooms";
import { Amenities } from "@/components/common/Amenities";
import { Location } from "@/components/common/Location";
import { Contact } from "@/components/common/Contact";
import { Footer } from "@/components/layout/Footer";
import { ChatbotWidget } from "@/components/ChatbotWidget";

const Index = () => {
  const location = useLocation();

  // Handle hash navigation from other pages
  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.replace('#', ''));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Welcome />
        <GoogleRating />
        <Rooms />
        <Amenities />
        <Location />
        <Contact />
      </main>
      <Footer />
      <ChatbotWidget />
    </div>
  );
};

export default Index;












