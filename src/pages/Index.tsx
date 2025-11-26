import Header from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Welcome } from "@/components/Welcome";
import { Rooms } from "@/components/Rooms";
import { Amenities } from "@/components/Amenities";
import { Location } from "@/components/Location";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import ChatbotWidget from "@/components/ChatbotWidget";
import { SearchDatesProvider } from "@/contexts/SearchDatesContext";

const Index = () => {
  return (
    <SearchDatesProvider>
      <div className="min-h-screen">
        <Header />
        <main>
          <Hero />
          <Welcome />
          <Rooms />
          <Amenities />
          <Location />
          <Contact />
        </main>
        <Footer />
        <ChatbotWidget />
      </div>
    </SearchDatesProvider>
  );
};

export default Index;
