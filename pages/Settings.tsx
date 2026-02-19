import React, { useState, useEffect } from 'react';
import { useVehicle } from '../contexts/VehicleContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  Button,
  Input,
  Select,
  Card,
  BackButton,
  PhotoInput,
} from '../components/UI';
import { Paywall } from '../components/Paywall';
import { UnitSystem } from '../types';
import { PDFExportService } from '../services/pdfExport';
import { Moon, Sun, Download, ShieldAlert, User, LogOut, LogIn, FileText, Scale, Sparkles, Star } from 'lucide-react';
import { dbClient } from '../services/database';
import { Capacitor } from '@capacitor/core';

interface SettingsProps {
  onNavigate: (view: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const { vehicle, fuelLogs, serviceLogs, updateVehicle, resetAll } =
    useVehicle();
  const { user, signOut } = useAuth();
  const { entitlementActive, isTrialActive, offerings, purchase, restore } = useSubscription();

  const [formData, setFormData] = useState(vehicle);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  useEffect(() => {
    setFormData(vehicle);
  }, [vehicle]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value =
      e.target.type === 'number'
        ? Number(e.target.value)
        : e.target.value;

    setFormData({ ...formData, [e.target.name]: value });
  };

  const handlePhotoChange = (base64: string) => {
    setFormData({ ...formData, photoUrl: base64 });
  };

  const handleRemovePhoto = () => {
    setFormData({ ...formData, photoUrl: undefined });
  };

  const handleThemeToggle = () => {
    const updated = {
      ...formData,
      theme: formData.theme === 'dark' ? 'light' : 'dark',
    };
    setFormData(updated);
    updateVehicle(updated);
  };

  const handleSave = () => {
    updateVehicle(formData);
    alert('Cambios guardados correctamente.');
    onNavigate('dashboard');
  };

  const handleExportPDF = async () => {
    if (fuelLogs.length === 0 && serviceLogs.length === 0) {
      alert('No hay registros suficientes para exportar.');
      return;
    }

    const includePhotos = window.confirm(
      '¿Deseas incluir las fotos en el PDF?\n\nEsto hará el archivo más pesado.'
    );

    setIsGeneratingPdf(true);
    try {
      await PDFExportService.generateHistoryPDF(
        vehicle,
        fuelLogs,
        serviceLogs,
        includePhotos
      );
    } catch (e) {
      console.error(e);
      alert('Error al generar el PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleReset = async () => {
    if (
      confirm(
        'Esta acción borrará toda la información actual del vehículo y su historial, tanto la almacenada en tu teléfono como la de la nube.\n\nEs ideal si cambiaste de vehículo o deseas comenzar de cero nuevamente.\n\n¿Confirmas que deseas continuar?'
      )
    ) {
      try {
        // Delete cloud data if user is authenticated
        if (user?.id) {
          // Delete all vehicles and their related data for this user
          const { error: vehiclesError } = await dbClient
            .from('vehicles')
            .delete()
            .eq('user_id', user.id);

          if (vehiclesError) {
            console.error('Error deleting vehicles:', vehiclesError);
          }

          // Delete fuel logs
          const { error: fuelError } = await dbClient
            .from('fuel_logs')
            .delete()
            .eq('user_id', user.id);

          if (fuelError) {
            console.error('Error deleting fuel logs:', fuelError);
          }

          // Delete service definitions
          const { error: defsError } = await dbClient
            .from('service_definitions')
            .delete()
            .eq('user_id', user.id);

          if (defsError) {
            console.error('Error deleting service definitions:', defsError);
          }

          // Delete service logs
          const { error: logsError } = await dbClient
            .from('service_logs')
            .delete()
            .eq('user_id', user.id);

          if (logsError) {
            console.error('Error deleting service logs:', logsError);
          }
        }

        // Delete local data
        resetAll();
        window.location.reload();
      } catch (error) {
        console.error('Error resetting data:', error);
        alert('Hubo un error al borrar los datos. Por favor, intenta de nuevo.');
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigate('auth');
  };

  const handleSignIn = () => {
    onNavigate('auth');
  };

  const openExternalUrl = async (url: string) => {
    if (Capacitor.isNativePlatform()) {
      // On native platforms, try to use Browser plugin
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url });
      } catch (error) {
        // Fallback if Browser plugin is not available
        window.open(url, '_blank');
      }
    } else {
      // On web, use window.open
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenPaywall = () => {
    setShowPaywallModal(true);
  };

  const handleClosePaywall = () => {
    setShowPaywallModal(false);
  };

  const isPremium = entitlementActive || isTrialActive;

  return (
    <div className="p-4 pt-5 pb-24 max-w-lg mx-auto">
      <BackButton onClick={() => onNavigate('dashboard')} title="Ajustes" />

      <div className="space-y-4">
        {/* Apariencia */}
        <Card
          className="py-3.5 px-4 flex justify-between items-center"
          onClick={handleThemeToggle}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gray-500/10 shrink-0">
              {formData.theme === 'dark' ? (
                <Moon size={20} className="text-gray-600 dark:text-gray-300" />
              ) : (
                <Sun size={20} className="text-gray-600 dark:text-gray-300" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Apariencia</p>
              <p className="text-xs text-gray-500 font-medium">
                {formData.theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
              </p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Card>

        {/* Suscripción */}
        <Card className="py-4 px-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-xl bg-blue-500/10 shrink-0">
              <Sparkles size={18} className="text-blue-500" />
            </div>
            <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider">
              Suscripción
            </h3>
          </div>

          {!isPremium ? (
            <div className="space-y-2.5">
              <button
                onClick={handleOpenPaywall}
                className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white py-3.5 px-5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles size={18} />
                Mejorar a Premium
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
                Desbloquea estadísticas ilimitadas
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="px-3 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center justify-center gap-2">
                <Star size={14} className="text-blue-500 fill-blue-500" />
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  Premium Activo
                </p>
              </div>
              <button
                onClick={handleOpenPaywall}
                className="w-full bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 active:scale-95 text-gray-800 dark:text-white py-3.5 px-5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Star size={18} />
                Administrar suscripción
              </button>
            </div>
          )}
        </Card>

        {/* Datos del vehículo */}
        <Card className="py-4 px-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-xl bg-blue-500/10 shrink-0">
              <User size={18} className="text-blue-500" />
            </div>
            <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider">
              Datos del Vehículo
            </h3>
          </div>

          <PhotoInput
            value={formData.photoUrl}
            onChange={handlePhotoChange}
            onRemove={handleRemovePhoto}
            aspectRatio={16 / 9}
          />

          <Input
            label="Marca"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
          />
          <Input
            label="Modelo"
            name="model"
            value={formData.model}
            onChange={handleChange}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Año"
              type="number"
              name="year"
              value={formData.year || ''}
              onChange={handleChange}
            />
            <Input
              label="Placa"
              name="plate"
              value={formData.plate}
              onChange={handleChange}
            />
          </div>

          <Input
            label="Odómetro Actual (km)"
            type="number"
            name="currentOdometer"
            value={formData.currentOdometer || ''}
            onChange={handleChange}
          />

          <Select
            label="Tipo de Combustible"
            name="fuelType"
            value={formData.fuelType}
            onChange={handleChange}
            options={[
              { value: 'Premium', label: 'Gasolina Premium' },
              { value: 'Regular', label: 'Gasolina Regular' },
              { value: 'Diesel', label: 'Diésel' },
            ]}
          />
        </Card>

        {/* Preferencias */}
        <Card className="py-4 px-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-xl bg-blue-500/10 shrink-0">
              <Scale size={18} className="text-blue-500" />
            </div>
            <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider">
              Preferencias
            </h3>
          </div>

          <Select
            label="Sistema de Unidades"
            name="unitSystem"
            value={formData.unitSystem}
            onChange={handleChange}
            options={[
              { value: UnitSystem.KM_GAL, label: 'Kilómetros / Galón' },
              { value: UnitSystem.KM_LITER, label: 'Kilómetros / Litro' },
              { value: UnitSystem.LITER_100KM, label: 'Litros / 100 km' },
            ]}
          />
        </Card>

        <Button
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-500 font-bold"
        >
          Guardar Cambios
        </Button>

        {/* Export PDF */}
        <Button
          onClick={handleExportPDF}
          disabled={isGeneratingPdf}
          className="bg-blue-600 hover:bg-blue-500 font-bold"
        >
          {isGeneratingPdf ? (
            'Generando…'
          ) : (
            <>
              <Download size={18} />
              Exportar Historial en PDF
            </>
          )}
        </Button>

        {/* Cuenta */}
        <Card className="py-4 px-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-xl bg-blue-500/10 shrink-0">
              <User size={18} className="text-blue-500" />
            </div>
            <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider">
              Cuenta
            </h3>
          </div>

          {user ? (
            <div className="space-y-3">
              <div className="px-3 py-2.5 bg-gray-100 dark:bg-white/5 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 font-medium">
                  Sesión activa
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white break-all">
                  {user.email}
                </p>
              </div>
              <Button
                onClick={handleSignOut}
                className="bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold"
              >
                <LogOut size={18} />
                Cerrar Sesión
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleSignIn}
              className="bg-blue-600 hover:bg-blue-500 font-bold"
            >
              <LogIn size={18} />
              Iniciar Sesión / Cambiar de Cuenta
            </Button>
          )}
        </Card>

        {/* Legal */}
        <Card className="py-1 px-2">
          <button
            onClick={() => openExternalUrl('https://labappstudio.com/motorcheck#privacidad')}
            className="w-full flex items-center justify-between px-3 py-3.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all group"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-gray-500 dark:text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Política de Privacidad
              </span>
            </div>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="mx-3 h-px bg-gray-200 dark:bg-white/5" />

          <button
            onClick={() => openExternalUrl('https://labappstudio.com/motorcheck#terminos')}
            className="w-full flex items-center justify-between px-3 py-3.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Scale size={18} className="text-gray-500 dark:text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Términos de Uso
              </span>
            </div>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </Card>

        {/* Zona de peligro */}
        <div className="pt-6 border-t border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={16} className="text-red-500" />
            <h3 className="text-xs text-red-500 font-black uppercase tracking-widest">
              Zona de Peligro
            </h3>
          </div>
          <Button
            onClick={handleReset}
            variant="danger"
            className="font-bold"
          >
            Borrar Todos los Datos
          </Button>
        </div>
      </div>

      {/* Paywall Modal */}
      {showPaywallModal && (
        <div className="fixed inset-0 z-50">
          <Paywall
            offerings={offerings}
            onPurchase={purchase}
            onRestore={restore}
            allowClose={true}
            onClose={handleClosePaywall}
          />
        </div>
      )}
    </div>
  );
};

export default Settings;