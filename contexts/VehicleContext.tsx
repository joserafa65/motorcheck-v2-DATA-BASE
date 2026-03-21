
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { FuelLog, ServiceDefinition, ServiceLog, ServiceStatus, VehicleSettings, PREDEFINED_SERVICES_GAS, DEFAULT_VEHICLE } from '../types';
import { StorageService } from '../services/storage';
import { NotificationService } from '../services/notifications';
import { useAuth } from './AuthContext';
import { backupVehicle, backupFuelLogs, backupServiceLogs, backupServiceDefinitions, migrateLocalToCloud, shouldMigrate, restoreFromCloud } from '../services/cloudBackup';

interface VehicleContextType {
  vehicle: VehicleSettings;
  fuelLogs: FuelLog[];
  serviceLogs: ServiceLog[];
  serviceDefinitions: ServiceDefinition[];
  serviceStatuses: ServiceStatus[];
  urgentCount: number;
  upcomingCount: number;
  updateVehicle: (v: VehicleSettings) => void;
  addFuelLog: (log: FuelLog) => void;
  updateFuelLog: (log: FuelLog) => void;
  addServiceLog: (log: ServiceLog) => void;
  updateServiceLog: (log: ServiceLog) => void;
  deleteFuelLog: (id: string) => void;
  deleteServiceLog: (id: string) => void;
  addServiceDefinition: (def: ServiceDefinition) => void;
  updateServiceDefinition: (def: ServiceDefinition) => void;
  deleteServiceDefinition: (id: string) => void;
  updateServiceDefinitions: (defs: ServiceDefinition[]) => void;
  resetAll: () => void;
  resetServicesToDefault: () => void;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export const VehicleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<VehicleSettings>(StorageService.getVehicle());
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(StorageService.getFuelLogs());
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>(StorageService.getServiceLogs());
  const [serviceDefinitions, setServiceDefinitions] = useState<ServiceDefinition[]>(StorageService.getServiceDefinitions());
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);
  const [urgentCount, setUrgentCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const isRestoringRef = useRef(false);

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (vehicle.theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [vehicle.theme]);

  // Persist changes
  useEffect(() => {
    StorageService.saveVehicle(vehicle);
    if (user?.id && !isRestoringRef.current) {
      backupVehicle(vehicle, user.id);
    }
  }, [vehicle, user?.id]);

  useEffect(() => {
    StorageService.saveFuelLogs(fuelLogs);
    if (user?.id && !isRestoringRef.current) {
      backupFuelLogs(fuelLogs, user.id);
    }
  }, [fuelLogs, user?.id]);

  useEffect(() => {
    StorageService.saveServiceLogs(serviceLogs);
    if (user?.id && !isRestoringRef.current) {
      backupServiceLogs(serviceLogs, user.id);
    }
  }, [serviceLogs, user?.id]);

  useEffect(() => {
    StorageService.saveServiceDefinitions(serviceDefinitions);
    if (user?.id && !isRestoringRef.current) {
      backupServiceDefinitions(serviceDefinitions, user.id);
    }
  }, [serviceDefinitions, user?.id]);

  // Migrate local data to cloud on first login
  useEffect(() => {
    if (user?.id && shouldMigrate()) {
      migrateLocalToCloud(user.id, vehicle, fuelLogs, serviceLogs, serviceDefinitions);
    }
  }, [user?.id]);

  // [DEBUG] Restore cloud data on login - condition check REMOVED, always restores
  useEffect(() => {
    if (!user?.id) return;

    const localIsEmpty = !vehicle.brand && fuelLogs.length === 0 && serviceLogs.length === 0;

    console.log('User detected:', user?.id);
    console.log('Local state:', vehicle, fuelLogs.length, serviceLogs.length);
    console.log('Should restore:', localIsEmpty, '(DEBUG: forcing restore regardless)');

    restoreFromCloud(user.id).then(result => {
      isRestoringRef.current = true;
      if (result.vehicle) {
        setVehicle(result.vehicle);
        StorageService.saveVehicle(result.vehicle);
      }
      if (result.fuelLogs.length > 0) {
        const sorted = [...result.fuelLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setFuelLogs(sorted);
        StorageService.saveFuelLogs(sorted);
      }
      if (result.serviceLogs.length > 0) {
        const sorted = [...result.serviceLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setServiceLogs(sorted);
        StorageService.saveServiceLogs(sorted);
      }
      if (result.serviceDefinitions.length > 0) {
        setServiceDefinitions(result.serviceDefinitions);
        StorageService.saveServiceDefinitions(result.serviceDefinitions);
      }
      setTimeout(() => { isRestoringRef.current = false; }, 0);
    });
  }, [user?.id]);

  // Calculate Statuses
  useEffect(() => {
    const statuses: ServiceStatus[] = serviceDefinitions.map(def => {
      const relevantLogs = serviceLogs.filter(l => l.serviceId === def.id);
      relevantLogs.sort((a, b) => b.odometer - a.odometer);
      
      const lastLog = relevantLogs.length > 0 ? relevantLogs[0] : null;
      
      let nextDueKm = 0;
      let nextDueDate: Date | null = null;
      let daysLeft = 99999;
      let kmLeft = 99999;
      let status: 'ok' | 'warning' | 'danger' = 'ok';

      if (lastLog) {
        nextDueKm = lastLog.odometer + def.intervalKm;
        kmLeft = nextDueKm - vehicle.currentOdometer;

        // Check if months interval is active (greater than 0)
        if (def.intervalMonths > 0) {
            const lastDate = new Date(lastLog.date);
            nextDueDate = new Date(lastDate.setMonth(lastDate.getMonth() + def.intervalMonths));
            daysLeft = Math.ceil((nextDueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        } else {
            nextDueDate = null;
            daysLeft = 99999;
        }
        
      } else {
        // If never performed
        if (def.nextDueOdometer) {
             // If user explicitly set a target (programming mode), respect it absolutely
             nextDueKm = def.nextDueOdometer;
        } else {
            // Fallback to modulo logic only if no explicit target exists
            if (vehicle.currentOdometer < def.intervalKm) {
                 nextDueKm = def.intervalKm;
            } else {
                 // If we have no record, we assume urgency based on mileage chunks
                 nextDueKm = (Math.floor(vehicle.currentOdometer / def.intervalKm) + 1) * def.intervalKm;
            }
        }

        kmLeft = nextDueKm - vehicle.currentOdometer;
        daysLeft = 99999; 
        nextDueDate = null;
      }

      // Logic refinement: Warning zone
      // Warn if < 500km OR < 30 days
      // Danger if < 0 km OR < 0 days
      
      if (kmLeft < 0 || daysLeft < 0) {
        status = 'danger';
      } else if (kmLeft <= 500 || (daysLeft <= 30 && def.intervalMonths > 0)) {
        status = 'warning';
      } else {
        status = 'ok';
      }

      return {
        serviceId: def.id,
        name: def.name,
        lastPerformedDate: lastLog ? lastLog.date : null,
        lastPerformedOdometer: lastLog ? lastLog.odometer : null,
        nextDueDate: nextDueDate ? nextDueDate.toISOString() : null,
        nextDueOdometer: nextDueKm,
        status,
        daysLeft,
        kmLeft
      };
    });

    // Sort: Danger First, then Warning, then OK (sorted by km left)
    statuses.sort((a, b) => {
        const score = (s: string) => s === 'danger' ? 0 : s === 'warning' ? 1 : 2;
        if (score(a.status) !== score(b.status)) return score(a.status) - score(b.status);
        return a.kmLeft - b.kmLeft;
    });

    setServiceStatuses(statuses);
    
    const dangers = statuses.filter(s => s.status === 'danger').length;
    const warnings = statuses.filter(s => s.status === 'warning').length;
    setUrgentCount(dangers);
    setUpcomingCount(warnings);

    // Trigger Notification if needed
    const criticalItems = statuses.filter(s => s.status === 'danger' || s.status === 'warning');
    if (criticalItems.length > 0) {
        if (NotificationService.checkFrequency() && NotificationService.getPermission() === 'granted') {
            const title = dangers > 0 
                ? `🚨 ¡Atención! ${dangers} servicio${dangers > 1 ? 's' : ''} vencido${dangers > 1 ? 's' : ''}`
                : `⚠️ Recordatorio de Mantenimiento`;
            
            const topItem = criticalItems[0];
            const body = `${topItem.name} requiere atención. ${dangers + warnings > 1 ? `+${dangers + warnings - 1} otros pendientes.` : ''}`;
            
            NotificationService.sendNotification(title, { body, icon: '/icon.png' });
            NotificationService.updateTimestamp();
        }
    }

  }, [vehicle.currentOdometer, serviceLogs, serviceDefinitions, vehicle.brand]);

  const updateVehicle = (v: VehicleSettings) => setVehicle(v);
  
  const addFuelLog = (log: FuelLog) => {
    setFuelLogs(prev => [log, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    if (log.odometer > vehicle.currentOdometer) {
      setVehicle(prev => ({ ...prev, currentOdometer: log.odometer }));
    }
  };

  const updateFuelLog = (updatedLog: FuelLog) => {
    setFuelLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const addServiceLog = (log: ServiceLog) => {
    setServiceLogs(prev => [log, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    if (log.odometer > vehicle.currentOdometer) {
      setVehicle(prev => ({ ...prev, currentOdometer: log.odometer }));
    }
  };

  const updateServiceLog = (updatedLog: ServiceLog) => {
    setServiceLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const deleteFuelLog = (id: string) => setFuelLogs(prev => prev.filter(l => l.id !== id));
  const deleteServiceLog = (id: string) => setServiceLogs(prev => prev.filter(l => l.id !== id));
  
  const addServiceDefinition = (def: ServiceDefinition) => {
    setServiceDefinitions(prev => [...prev, def]);
  };

  const updateServiceDefinition = (def: ServiceDefinition) => {
    setServiceDefinitions(prev => prev.map(d => d.id === def.id ? def : d));
  };

  const deleteServiceDefinition = (id: string) => {
    setServiceDefinitions(prev => prev.filter(d => d.id !== id));
  };

  const updateServiceDefinitions = (defs: ServiceDefinition[]) => setServiceDefinitions(defs);
  
  const resetAll = () => {
    StorageService.clearAll();
    setVehicle({ ...DEFAULT_VEHICLE, theme: vehicle.theme });
    setFuelLogs([]);
    setServiceLogs([]);
    setServiceDefinitions(PREDEFINED_SERVICES_GAS);
  };

  const resetServicesToDefault = () => {
      setServiceDefinitions(PREDEFINED_SERVICES_GAS);
  };

  return (
    <VehicleContext.Provider value={{
      vehicle,
      fuelLogs,
      serviceLogs,
      serviceDefinitions,
      serviceStatuses,
      urgentCount,
      upcomingCount,
      updateVehicle,
      addFuelLog,
      updateFuelLog,
      addServiceLog,
      updateServiceLog,
      deleteFuelLog,
      deleteServiceLog,
      addServiceDefinition,
      updateServiceDefinition,
      deleteServiceDefinition,
      updateServiceDefinitions,
      resetAll,
      resetServicesToDefault
    }}>
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicle = () => {
  const context = useContext(VehicleContext);
  if (!context) throw new Error("useVehicle must be used within a VehicleProvider");
  return context;
};