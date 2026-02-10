import React, { useState, useRef } from 'react';

interface AnimatedSplashProps {
  onFinish: () => void;
}

let animationFinished = false;

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onFinish }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const hasFinished = useRef(false);

  const handleAnimationEnd = () => {
    if (hasFinished.current || animationFinished) {
      return;
    }
    hasFinished.current = true;
    animationFinished = true;
    onFinish();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
      style={{
        animation: 'splashFade 2s ease-in-out forwards',
      }}
      onAnimationEnd={handleAnimationEnd}
    >
      <img
        src="/motorcheck_splashscreen2negro_.webp"
        alt="MotorCheck"
        className="w-full h-full object-cover"
        style={{
          opacity: imageLoaded ? 1 : 0,
          transition: 'opacity 300ms ease-in-out',
        }}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageLoaded(false)}
      />
      <style>{`
        @keyframes splashFade {
          0% { opacity: 0; }
          10% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};
