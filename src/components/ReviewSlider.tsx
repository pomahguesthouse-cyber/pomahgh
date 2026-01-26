import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, User, Quote } from "lucide-react";
import { GoogleReview } from "@/hooks/useGoogleRating";
interface ReviewSliderProps {
  reviews: GoogleReview[];
}
export function ReviewSlider({
  reviews
}: ReviewSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % reviews.length);
  }, [reviews.length]);

  // Autoplay
  useEffect(() => {
    if (isPaused || reviews.length <= 1) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide, reviews.length]);
  if (!reviews || reviews.length === 0) return null;
  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />);
  };
  return <div className="mt-10 w-full max-w-3xl mx-auto" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      
      
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={currentIndex} initial={{
          opacity: 0,
          x: 50
        }} animate={{
          opacity: 1,
          x: 0
        }} exit={{
          opacity: 0,
          x: -50
        }} transition={{
          duration: 0.4,
          ease: "easeInOut"
        }} className="bg-card border border-border rounded-xl p-6 shadow-lg">
            {/* Quote Icon */}
            <Quote className="h-8 w-8 text-primary/20 mb-4" />
            
            {/* Review Text */}
            <p className="text-muted-foreground leading-relaxed mb-6 line-clamp-4 min-h-[6rem]">
              "{reviews[currentIndex].text || 'Ulasan tanpa teks'}"
            </p>
            
            {/* Author Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {reviews[currentIndex].authorPhoto ? <img src={reviews[currentIndex].authorPhoto} alt={reviews[currentIndex].authorName} className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" /> : <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>}
                <div>
                  <p className="font-medium text-foreground">
                    {reviews[currentIndex].authorName}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex">{renderStars(reviews[currentIndex].rating)}</div>
                    <span className="text-xs text-muted-foreground">
                      {reviews[currentIndex].relativeTime}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Google Badge */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-full">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Dots */}
      {reviews.length > 1 && <div className="flex justify-center gap-2 mt-6">
          {reviews.map((_, index) => <button key={index} onClick={() => setCurrentIndex(index)} className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`} aria-label={`Go to review ${index + 1}`} />)}
        </div>}
    </div>;
}