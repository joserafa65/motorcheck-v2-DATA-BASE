
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { FuelLog, ServiceDefinition, ServiceLog, ServiceStatus, VehicleSettings, PREDEFINED_SERVICES_GAS, DEFAULT_VEHICLE } from '../types';
import { StorageService } from '../services/storage';
import { NotificationService } from '../services/notifications';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { backupVehicle, backupFuelLogs, backupServiceLogs, backupServiceDefinitions, deleteFuelLogFromCloud, deleteServiceLogFromCloud, deleteServiceDefinitionFromCloud, getCachedVehicleId, migrateLocalToCloud, shouldMigrate, restoreFromCloud, clearCachedVehicleId } from '../services/cloudBackup';
import { getQueue, onQueueChange, registerOnlineListener, clearQueue } from '../services/offlineQueue';

interface VehicleContextType {
  vehicle: VehicleSettings;
  fuelLogs: FuelLog[];
  serviceLogs: ServiceLog[];
  serviceDefinitions: ServiceDefinition[];
  serviceStatuses: ServiceStatus[];
  urgentCount: number;
  upcomingCount: number;
  isRestoring: boolean;
  pendingCount: number;
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
  const { showToast } = useToast();
  const [vehicle, setVehicle] = useState<VehicleSettings>(StorageService.getVehicle());
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(StorageService.getFuelLogs());
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>(StorageService.getServiceLogs());
  const [serviceDefinitions, setServiceDefinitions] = useState<ServiceDefinition[]>(StorageService.getServiceDefinitions());
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);
  const [urgentCount, setUrgentCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingCount, setPendingCount] = useState(() => getQueue().length);
  const isRestoringRef = useRef(false);
  const isMigratingRef = useRef(false);
  const hasRestoredRef = useRef(false);

  // Register online listener once globally so offline writes are replayed on reconnect
  useEffect(() => {
    registerOnlineListener();
    const unsubscribe = onQueueChange(setPendingCount);
    return unsubscribe;
  }, []);

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (vehicle.theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [vehicle.theme]);

  // Clear memory cache and restore flag when user logs out
  useEffect(() => {
    if (!user?.id) {
      clearCachedVehicleId();
      hasRestoredRef.current = false;
      isRestoringRef.current = false;
      setIsRestoring(false);
    }
  }, [user?.id]);

  // Persist changes
  useEffect(() => {
    StorageService.saveVehicle(vehicle);
    if (user?.id) {
      if (isRestoringRef.current || isMigratingRef.current) {
        console.log('[CloudBackup] Backup skipped: restore/migration in progress (vehicle)');
      } else if (!vehicle.brand) {
        console.log('[CloudBackup] Backup skipped: empty vehicle profile');
      } else {
        backupVehicle(vehicle, user.id, () => showToast('Error al sincronizar vehículo. Reintentando…'));
      }
    }
  }, [vehicle, user?.id]);

  useEffect(() => {
    StorageService.saveFuelLogs(fuelLogs);
    if (user?.id) {
      if (isRestoringRef.current || isMigratingRef.current) {
        console.log('[CloudBackup] Backup skipped: restore/migration in progress (fuel_logs)');
      } else {
        backupFuelLogs(fuelLogs, user.id, vehicle, () => showToast('Error al sincronizar registros de combustible. Reintentando…'));
      }
    }
  }, [fuelLogs, user?.id]);

  useEffect(() => {
    StorageService.saveServiceLogs(serviceLogs);
    if (user?.id) {
      if (isRestoringRef.current || isMigratingRef.current) {
        console.log('[CloudBackup] Backup skipped: restore/migration in progress (service_logs)');
      } else {
        backupServiceLogs(serviceLogs, user.id, vehicle, () => showToast('Error al sincronizar servicios. Reintentando…'));
      }
    }
  }, [serviceLogs, user?.id]);

  useEffect(() => {
    StorageService.saveServiceDefinitions(serviceDefinitions);
    if (user?.id) {
      if (isRestoringRef.current || isMigratingRef.current) {
        console.log('[CloudBackup] Backup skipped: restore/migration in progress (service_definitions)');
      } else if (!vehicle.brand) {
        console.log('[CloudBackup] Backup skipped: empty vehicle profile (service_definitions)');
      } else {
        backupServiceDefinitions(serviceDefinitions, user.id, vehicle, () => showToast('Error al sincronizar definiciones de servicio. Reintentando…'));
      }
    }
  }, [serviceDefinitions, user?.id]);

  // Migrate local data to cloud on first login
  useEffect(() => {
    if (user?.id && shouldMigrate()) {
      isMigratingRef.current = true;
      (async () => {
        try {
          await migrateLocalToCloud(user.id, vehicle, fuelLogs, serviceLogs, serviceDefinitions);
          clearQueue();
        } catch (e) {
          console.error('[CloudBackup] Migration failed:', e);
          showToast('Error al sincronizar datos por primera vez. Reintentando en el próximo inicio.');
        } finally {
          isMigratingRef.current = false;
        }
      })();
    }
  }, [user?.id]);

  // Restore cloud data on login — runs only once per session, only if local data is empty
  useEffect(() => {
    if (!user?.id) return;

    if (hasRestoredRef.current) {
      console.log('[CloudBackup] Restore skipped: already restored');
      return;
    }

    const localIsEmpty = !vehicle.brand && fuelLogs.length === 0 && serviceLogs.length === 0;
    if (!localIsEmpty) {
      console.log('[CloudBackup] Restore skipped: local data exists');
      return;
    }

    // Set the restoring flag synchronously so backup effects firing in the same
    // render cycle see it immediately and skip their writes.
    console.log('[CloudBackup] Restore starting...');
    isRestoringRef.current = true;
    setIsRestoring(true);

    (async () => {
      try {
        const result = await restoreFromCloud(user.id);
        hasRestoredRef.current = true;

        // Clear any queue entries that were enqueued before the restore completed
        // (e.g. predefined service definitions backed up against an empty profile).
        clearQueue();

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

        console.log('[CloudBackup] Restore completed');
      } catch (e) {
        console.error('[CloudBackup] Restore failed:', e);
        showToast('No se pudo restaurar tu información. Revisa tu conexión.');
      } finally {
        setTimeout(() => {
          isRestoringRef.current = false;
          setIsRestoring(false);
        }, 300);
      }
    })();
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

  const deleteFuelLog = (id: string) => {
    setFuelLogs(prev => prev.filter(l => l.id !== id));
    if (user?.id) deleteFuelLogFromCloud(id, user.id);
  };

  const deleteServiceLog = (id: string) => {
    setServiceLogs(prev => prev.filter(l => l.id !== id));
    if (user?.id) deleteServiceLogFromCloud(id, user.id);
  };

  const addServiceDefinition = (def: ServiceDefinition) => {
    setServiceDefinitions(prev => [...prev, def]);
  };

  const updateServiceDefinition = (def: ServiceDefinition) => {
    setServiceDefinitions(prev => prev.map(d => d.id === def.id ? def : d));
  };

  const deleteServiceDefinition = (id: string) => {
    setServiceDefinitions(prev => prev.filter(d => d.id !== id));
    if (user?.id) {
      const vehicleId = getCachedVehicleId();
      if (vehicleId) deleteServiceDefinitionFromCloud(id, user.id, vehicleId);
    }
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
      isRestoring,
      pendingCount,
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