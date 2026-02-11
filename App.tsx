import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import { VehicleProvider } from './contexts/VehicleContext';
import Dashboard from './pages/Dashboard';
import Fuel from './pages/Fuel';
import Services from './pages/Services';
import History from './pages/History';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import Auth from './pages/Auth';
import { AnimatedSplash } from './components/AnimatedSplash';
import {
  Home,
  Wrench,
  BarChart2,
  Settings as SettingsIcon,
  ClipboardList,
} from 'lucide-react';
import { StorageService } from './services/storage';
import { NotificationService } from './services/notifications';

let splashAlreadyShown = false;

const AppContent: React.FC = () => {
  const { session, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewParams, setViewParams] = useState<any>({});
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(!splashAlreadyShown);

  // INIT APP
  useEffect(() => {
    const initApp = async () => {
      const hasCompletedOnboarding = StorageService.hasCompletedOnboarding();
      setShowOnboarding(!hasCompletedOnboarding);
      setIsReady(true);
    };

    initApp();
  }, []);

  // 🔔 NOTIFICACIONES
  useEffect(() => {
    if (session && !showOnboarding && isReady) {
      NotificationService.requestPermission().then(result => {
        if (result === 'granted') {
          // NO registrar listeners ahora (evitamos crashes)
        }
      });
    }
  }, [session, showOnboarding, isReady]);

  const handleOnboardingComplete = () => {
    StorageService.setOnboardingCompleted();
    setShowOnboarding(false);
  };

  const handleSplashFinish = () => {
    splashAlreadyShown = true;
    setShowSplash(false);
  };

  const handleNavigation = (view: string, params: any = {}) => {
    setCurrentView(view);
    setViewParams(params);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigation} />;
      case 'fuel':
        return (
          <Fuel
            onNavigate={handleNavigation}
            initialTab={viewParams.initialTab}
            editLogId={viewParams.editLogId}
            fromHistory={viewParams.fromHistory}
          />
        );
      case 'fuel_history':
        return <Fuel onNavigate={handleNavigation} initialTab="history" />;
      case 'services':
        return (
          <Services
            onNavigate={handleNavigation}
            initialServiceId={viewParams.serviceId}
            startInProgramMode={viewParams.startInProgramMode}
            editLogId={viewParams.editLogId}
            fromHistory={viewParams.fromHistory}
          />
        );
      case 'history':
        return <History onNavigate={handleNavigation} />;
      case 'stats':
        return <Stats onNavigate={handleNavigation} />;
      case 'settings':
        return <Settings onNavigate={handleNavigation} />;
      default:
        return <Dashboard onNavigate={handleNavigation} />;
    }
  };

  // Determine what to show based on state
  const shouldShowOnboarding = !authLoading && isReady && showOnboarding;
  const shouldShowAuth = !authLoading && isReady && !showOnboarding && !session;
  const shouldShowApp = !authLoading && isReady && !showOnboarding && session;

  return (
    <>
      {showSplash && <AnimatedSplash onFinish={handleSplashFinish} />}

      {!showSplash && (authLoading || !isReady) && null}

      {!showSplash && shouldShowOnboarding && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      {!showSplash && shouldShowAuth && <Auth />}

      {!showSplash && shouldShowApp && (
        <SubscriptionProvider>
          <SubscriptionGate
            renderView={renderView}
            currentView={currentView}
            handleNavigation={handleNavigation}
          />
        </SubscriptionProvider>
      )}
    </>
  );
};

const SubscriptionGate: React.FC<{
  renderView: () => React.ReactNode;
  currentView: string;
  handleNavigation: (view: string, params?: any) => void;
}> = ({ renderView, currentView, handleNavigation }) => {
  const { loading, showPaywall } = useSubscription();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (showPaywall) {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden">
        <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <div className="max-w-md">
            <div className="text-6xl mb-6">🔒</div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Tu periodo de prueba terminó
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Necesitas activar Premium para continuar
            </p>
            <div className="text-gray-400">
              <p>Paywall UI próximamente...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const NavItem = ({ view, params, icon: Icon, label }: any) => (
    <button
      onClick={() => handleNavigation(view, params)}
      className={`flex flex-col items-center justify-center w-full py-3 transition-colors duration-200 ${
        currentView === view
          ? 'text-blue-500 dark:text-blue-400'
          : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
      }`}
    >
      <Icon size={22} strokeWidth={currentView === view ? 2.5 : 2} />
      <span className="text-[11px] mt-1 font-medium">{label}</span>
    </button>
  );

  return (
    <VehicleProvider>
      <div className="relative min-h-screen overflow-hidden selection:bg-blue-500/30">
        {/* Background Gradients */}
        <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 dark:bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 dark:bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />

        {/* CONTENT */}
        <div
          className="relative z-10 max-w-lg mx-auto px-4 pb-28 overflow-y-auto"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {renderView()}
        </div>

        {/* BOTTOM NAV */}
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div
            className="max-w-lg mx-auto bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 flex justify-between px-6 pt-2 shadow-lg"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <NavItem view="dashboard" icon={Home} label="Inicio" />
            <NavItem view="services" icon={Wrench} label="Servicios" />
            <NavItem view="history" icon={ClipboardList} label="Historial" />
            <NavItem view="stats" icon={BarChart2} label="Estad." />
            <NavItem view="settings" icon={SettingsIcon} label="Ajustes" />
          </div>
        </div>
      </div>
    </VehicleProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
