import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2000);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2600);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[200] bg-[#4169E1] transition-opacity duration-700 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img
        src="/ezgif.com-video-to-webp-converter.webp"
        alt="MotorCheck Splash"
        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${
          isExiting ? 'scale-105' : 'scale-100'
        }`}
      />
    </div>
  );
};

export default SplashScreen;