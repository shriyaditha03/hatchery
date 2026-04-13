import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/aqua-nexus-logo.png';

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/welcome'), 100);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen ocean-gradient flex flex-col items-center justify-center text-primary-foreground">
      <div className="animate-pulse-glow rounded-full p-1 mb-8">
        <img src={logo} alt="Shrimpit Shrimp" className="w-32 h-32 rounded-full" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-2 animate-fade-in-up">
        <span className="text-orange-400">Shrimp</span>
        <span className="text-rose-300">it</span>
      </h1>
      <p className="text-lg opacity-80 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        Smart Shrimp Farm Management
      </p>
      <div className="mt-12 flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary-foreground/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
