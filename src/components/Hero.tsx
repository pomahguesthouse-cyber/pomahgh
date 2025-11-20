import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-guesthouse.jpg";

export const Hero = () => {
  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 hero-gradient"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 animate-fade-in">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-card mb-6">
          Pomah Guesthouse
        </h1>
        <p className="text-xl md:text-2xl text-card/90 mb-8 max-w-2xl mx-auto">
          Experience Tropical Paradise Where Luxury Meets Serenity
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            variant="hero" 
            size="lg" 
            className="text-lg"
            onClick={() => document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" })}
          >
            Explore Rooms
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="text-lg border-card text-card hover:bg-card hover:text-primary"
            onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
          >
            Contact Us
          </Button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-card/50 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-card/50 rounded-full"></div>
        </div>
      </div>
    </section>
  );
};
