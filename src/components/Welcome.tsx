export const Welcome = () => {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="animate-slide-up">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 px-2">
            Welcome to Paradise
          </h2>
          <div className="w-16 sm:w-24 h-1 bg-primary mx-auto mb-6 sm:mb-8"></div>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-4 sm:mb-6 px-4">
            Nestled in the heart of Bali's tropical beauty, Pomah Guesthouse offers an 
            exclusive retreat where modern luxury harmonizes with traditional Balinese charm. 
            Our carefully designed spaces provide the perfect sanctuary for those seeking 
            tranquility and authentic Indonesian hospitality.
          </p>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed px-4">
            Each moment at Pomah is crafted to awaken your senses—from the gentle sound of 
            ocean waves to the lush tropical gardens that surround you. Discover your personal 
            haven where every detail is thoughtfully curated for your comfort and rejuvenation.
          </p>
        </div>
      </div>
    </section>
  );
};
