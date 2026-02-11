import React, { useState, useEffect } from 'react';
import { useVehicle } from '../contexts/VehicleContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Button,
  Input,
  Select,
  Card,
  BackButton,
  PhotoInput,
} from '../components/UI';
import { UnitSystem } from '../types';
import { PDFExportService } from '../services/pdfExport';
import { Moon, Sun, Download, ShieldAlert, User, LogOut, LogIn } from 'lucide-react';
import { dbClient } from '../services/database';

interface SettingsProps {
  onNavigate: (view: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const { vehicle, fuelLogs, serviceLogs, updateVehicle, resetAll } =
    useVehicle();
  const { user, signOut } = useAuth();

  const [formData, setFormData] = useState(vehicle);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
        '¡ATENCIÓN! Esto borrará TODOS los datos, registros y configuraciones tanto en LOCAL como en la NUBE.\n\nEsto es útil si cambias de vehículo y quieres empezar desde cero.\n\n¿Estás seguro?'
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
    </div>
  );
};

export default Settings;