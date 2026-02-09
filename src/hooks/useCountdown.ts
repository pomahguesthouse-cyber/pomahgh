import { useState, useEffect, useCallback } from "react";

interface CountdownResult {
  minutes: number;
  seconds: number;
  formattedTime: string;
  isExpired: boolean;
  progress: number;
  totalSecondsRemaining: number;
}

export const useCountdown = (targetDate: string): CountdownResult => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  const calculateTimeLeft = useCallback(() => {
    const target = new Date(targetDate).getTime();
    const now = new Date().getTime();
    const difference = target - now;

    if (difference <= 0) {
      setIsExpired(true);
      return 0;
    }

    setIsExpired(false);
    return Math.floor(difference / 1000);
  }, [targetDate]);

  useEffect(() => {
    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  // Calculate progress (3600 seconds = 1 hour)
  const totalSecondsRemaining = timeLeft;
  const progress = Math.max(0, Math.min(100, (timeLeft / 3600) * 100));

  return {
    minutes,
    seconds,
    formattedTime,
    isExpired,
    progress,
    totalSecondsRemaining
  };
};
