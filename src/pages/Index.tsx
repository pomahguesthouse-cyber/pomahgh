import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Welcome } from "@/components/Welcome";
import { Rooms } from "@/components/Rooms";
import { Amenities } from "@/components/Amenities";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Welcome />
        <Rooms />
        <Amenities />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
