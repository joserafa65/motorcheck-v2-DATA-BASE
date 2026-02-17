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

      <div className="space-y-6">
        {/* Apariencia */}
        <Card
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-all"
          onClick={handleThemeToggle}
        >
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Apariencia
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              {formData.theme === 'dark'
                ? 'Modo Oscuro'
                : 'Modo Claro'}
            </p>
          </div>
          <div className="p-3 rounded-2xl">
            {formData.theme === 'dark' ? (
              <Moon size={26} />
            ) : (
              <Sun size={26} />
            )}
          </div>
        </Card>

        {/* Datos del vehículo */}
        <Card className="p-4">
          <h3 className="text-lg font-bold mb-5 text-blue-500 uppercase tracking-wider">
            Datos del Vehículo
          </h3>

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
        <Card className="p-4">
          <h3 className="text-lg font-bold mb-5 text-blue-500 uppercase tracking-wider">
            Preferencias
          </h3>

          <Select
            label="Sistema de Unidades"
            name="unitSystem"
            value={formData.unitSystem}
            onChange={handleChange}
            options={[
              {
                value: UnitSystem.KM_GAL,
                label: 'Kilómetros / Galón',
              },
              {
                value: UnitSystem.KM_LITER,
                label: 'Kilómetros / Litro',
              },
              {
                value: UnitSystem.LITER_100KM,
                label: 'Litros / 100 km',
              },
            ]}
          />
        </Card>

        <Button
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-500 text-lg py-4 font-bold"
        >
          Guardar Cambios
        </Button>

        {/* Export PDF */}
        <Button
          onClick={handleExportPDF}
          disabled={isGeneratingPdf}
          className="bg-blue-600 hover:bg-blue-500 py-5 text-lg font-bold"
        >
          {isGeneratingPdf ? (
            'Generando…'
          ) : (
            <>
              <Download size={22} />
              Exportar Historial en PDF
            </>
          )}
        </Button>

        {/* Cuenta */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <User size={20} className="text-blue-500" />
            <h3 className="text-lg font-bold text-blue-500 uppercase tracking-wider">
              Cuenta
            </h3>
          </div>

          {user ? (
            <div className="space-y-4">
              <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                  Sesión activa
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white break-all">
                  {user.email}
                </p>
              </div>
              <Button
                onClick={handleSignOut}
                className="bg-gray-600 hover:bg-gray-500 py-4 text-lg font-bold w-full"
              >
                <LogOut size={22} />
                Cerrar Sesión
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleSignIn}
              className="bg-blue-600 hover:bg-blue-500 py-4 text-lg font-bold w-full"
            >
              <LogIn size={22} />
              Iniciar Sesión / Cambiar de Cuenta
            </Button>
          )}
        </Card>

        {/* Suscripción */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-blue-500" />
            <h3 className="text-lg font-bold text-blue-500 uppercase tracking-wider">
              Suscripción
            </h3>
          </div>

          {!isPremium ? (
            <div className="space-y-3">
              <button
                onClick={handleOpenPaywall}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Sparkles size={22} />
                Mejorar a Premium
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center font-medium">
                Desbloquea estadísticas ilimitadas
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mb-3 px-3 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2 justify-center">
                  <Star size={16} className="text-blue-500 fill-blue-500" />
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    Premium Activo
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenPaywall}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
              >
                <Star size={22} />
                Administrar suscripción
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center font-medium">
                Gestiona tu plan actual
              </p>
            </div>
          )}
        </Card>

        {/* Legal */}
        <Card className="p-4">
          <button
            onClick={() => openExternalUrl('https://labappstudio.com/motorcheck#privacidad')}
            className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all group"
          >
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-gray-600 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-white font-medium">
                Política de Privacidad
              </span>
            </div>
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => openExternalUrl('https://labappstudio.com/motorcheck#terminos')}
            className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Scale size={20} className="text-gray-600 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-white font-medium">
                Términos de Uso
              </span>
            </div>
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </Card>

        {/* Zona de peligro */}
        <div className="pt-8 border-t border-gray-300 dark:border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={20} className="text-red-500" />
            <h3 className="text-red-500 font-black uppercase tracking-widest text-sm">
              Zona de Peligro
            </h3>
          </div>
          <Button
            onClick={handleReset}
            variant="danger"
            className="py-4 font-bold"
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