import React, { useState, useRef, useEffect } from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

const SCREENS = [
  '/MOTOR-CHECK-ONBOARDING-SCREENS-01.jpg',
  '/MOTOR-CHECK-ONBOARDING-SCREENS-02.jpg',
  '/MOTOR-CHECK-ONBOARDING-SCREENS-03.jpg',
  '/MOTOR-CHECK-ONBOARDING-SCREENS-04.jpg',
  '/MOTOR-CHECK-ONBOARDING-SCREENS-05.jpg',
  '/MOTOR-CHECK-ONBOARDING-SCREENS-06.jpg',
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 50);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < SCREENS.length - 1) {
        goToNext();
      } else if (diff < 0 && currentIndex > 0) {
        goToPrev();
      }
    }
  };

  const goToNext = () => {
    if (isTransitioning || currentIndex >= SCREENS.length - 1) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => prev + 1);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const goToPrev = () => {
    if (isTransitioning || currentIndex <= 0) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => prev - 1);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <div className={`fixed inset-0 z-[100] bg-black overflow-hidden transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div
        ref={containerRef}
        className="relative w-full h-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {SCREENS.map((screen, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-[600ms] ${
              index === currentIndex
                ? 'opacity-100 translate-x-0 scale-100'
                : index < currentIndex
                ? 'opacity-0 -translate-x-[10%] scale-95'
                : 'opacity-0 translate-x-[10%] scale-95'
            }`}
            style={{
              backgroundImage: `url(${screen})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div className="absolute inset-0 bg-black/10" />
          </div>
        ))}

        {currentIndex === SCREENS.length - 1 && (
          <div className="absolute inset-0 flex items-center justify-center px-6 animate-fade-in-scale">
            <button
              onClick={handleComplete}
              className="w-full max-w-xs py-4 bg-white/90 backdrop-blur-lg text-black font-bold text-lg rounded-2xl hover:bg-white hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xl"
            >
              Empezar
            </button>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-2 pb-safe">
        {SCREENS.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-500 rounded-full ${
              index === currentIndex
                ? 'w-8 h-2 bg-white shadow-lg shadow-white/50'
                : 'w-2 h-2 bg-white/40 hover:bg-white/60 hover:scale-125'
            }`}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            aria-label={`Ir a pantalla ${index + 1}`}
          />
        ))}
      </div>

      <style>{`
        @keyframes fade-in-scale {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both;
        }
      `}</style>
    </div>
  );
};

export default Onboarding;
