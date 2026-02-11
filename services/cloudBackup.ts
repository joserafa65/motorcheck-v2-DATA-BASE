
import { dbClient } from './database';
import { FuelLog, ServiceLog, VehicleSettings, ServiceDefinition } from '../types';

const CLOUD_KEYS = {
  VEHICLE_ID: 'motorcheck_cloud_vehicle_id',
  MIGRATION_COMPLETED: 'motorcheck_cloud_migration_completed'
};

// Helper to get or create vehicle_id in cloud
const getOrCreateVehicleId = async (userId: string): Promise<string | null> => {
  try {
    // Check localStorage first
    const cachedId = localStorage.getItem(CLOUD_KEYS.VEHICLE_ID);
    if (cachedId) return cachedId;

    // Try to find existing vehicle in cloud
    const { data: vehicles, error } = await dbClient
      .from('vehicles')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('[CloudBackup] Error fetching vehicle:', error);
      return null;
    }

    if (vehicles && vehicles.length > 0) {
      const vehicleId = vehicles[0].id;
      localStorage.setItem(CLOUD_KEYS.VEHICLE_ID, vehicleId);
      return vehicleId;
    }

    return null;
  } catch (e) {
    console.error('[CloudBackup] Error in getOrCreateVehicleId:', e);
    return null;
  }
};

// Map local VehicleSettings to database format
const mapVehicleToDb = (vehicle: VehicleSettings, userId: string) => ({
  user_id: userId,
  brand: vehicle.brand,
  model: vehicle.model,
  year: vehicle.year,
  plate: vehicle.plate,
  current_odometer: vehicle.currentOdometer,
  fuel_type: vehicle.fuelType,
  oil_type_engine: vehicle.oilTypeEngine,
  oil_type_transmission: vehicle.oilTypeTransmission,
  unit_system: vehicle.unitSystem,
  photo_url: null, // base64 not supported in cloud yet
  theme: vehicle.theme,
  updated_at: new Date().toISOString()
});

// Map local FuelLog to database format
const mapFuelLogToDb = (log: FuelLog, userId: string, vehicleId: string) => ({
  id: log.id,
  vehicle_id: vehicleId,
  user_id: userId,
  date: log.date,
  odometer: log.odometer,
  volume: log.volume,
  price_per_unit: log.pricePerUnit,
  total_cost: log.totalCost,
  fuel_type: log.fuelType || null,
  is_full_tank: log.isFullTank,
  receipt_photo_url: null, // base64 not supported in cloud yet
  updated_at: new Date().toISOString()
});

// Map local ServiceLog to database format
const mapServiceLogToDb = (log: ServiceLog, userId: string, vehicleId: string) => ({
  id: log.id,
  vehicle_id: vehicleId,
  user_id: userId,
  service_id: log.serviceId,
  service_name: log.serviceName,
  date: log.date,
  odometer: log.odometer,
  cost: log.cost,
  notes: log.notes,
  receipt_photo_url: null, // base64 not supported in cloud yet
  updated_at: new Date().toISOString()
});

// Map local ServiceDefinition to database format
const mapServiceDefToDb = (def: ServiceDefinition, userId: string, vehicleId: string) => ({
  id: def.id,
  vehicle_id: vehicleId,
  user_id: userId,
  name: def.name,
  interval_km: def.intervalKm,
  interval_months: def.intervalMonths,
  notes: def.notes || null,
  next_due_odometer: def.nextDueOdometer || null,
  updated_at: new Date().toISOString()
});

// Backup vehicle to cloud (fire & forget)
export const backupVehicle = async (vehicle: VehicleSettings, userId: string): Promise<void> => {
  try {
    const vehicleId = await getOrCreateVehicleId(userId);
    const vehicleData = mapVehicleToDb(vehicle, userId);

    if (vehicleId) {
      // Update existing vehicle
      const { error } = await dbClient
        .from('vehicles')
        .update(vehicleData)
        .eq('id', vehicleId);

      if (error) {
        console.error('[CloudBackup] Error updating vehicle:', error);
      }
    } else {
      // Create new vehicle
      const { data, error } = await dbClient
        .from('vehicles')
        .insert([vehicleData])
        .select('id');

      if (error) {
        console.error('[CloudBackup] Error creating vehicle:', error);
      } else if (data && data.length > 0) {
        localStorage.setItem(CLOUD_KEYS.VEHICLE_ID, data[0].id);
      }
    }
  } catch (e) {
    console.error('[CloudBackup] Exception in backupVehicle:', e);
  }
};

// Backup fuel logs to cloud (fire & forget)
export const backupFuelLogs = async (logs: FuelLog[], userId: string): Promise<void> => {
  try {
    const vehicleId = await getOrCreateVehicleId(userId);
    if (!vehicleId) {
      console.error('[CloudBackup] No vehicle ID for fuel logs backup');
      return;
    }

    // Delete all existing fuel logs for this vehicle
    await dbClient
      .from('fuel_logs')
      .delete()
      .eq('vehicle_id', vehicleId);

    if (logs.length === 0) return;

    // Insert all current logs
    const logsData = logs.map(log => mapFuelLogToDb(log, userId, vehicleId));
    const { error } = await dbClient
      .from('fuel_logs')
      .insert(logsData);

    if (error) {
      console.error('[CloudBackup] Error backing up fuel logs:', error);
    }
  } catch (e) {
    console.error('[CloudBackup] Exception in backupFuelLogs:', e);
  }
};

// Backup service logs to cloud (fire & forget)
export const backupServiceLogs = async (logs: ServiceLog[], userId: string): Promise<void> => {
  try {
    const vehicleId = await getOrCreateVehicleId(userId);
    if (!vehicleId) {
      console.error('[CloudBackup] No vehicle ID for service logs backup');
      return;
    }

    // Delete all existing service logs for this vehicle
    await dbClient
      .from('service_logs')
      .delete()
      .eq('vehicle_id', vehicleId);

    if (logs.length === 0) return;

    // Insert all current logs
    const logsData = logs.map(log => mapServiceLogToDb(log, userId, vehicleId));
    const { error } = await dbClient
      .from('service_logs')
      .insert(logsData);

    if (error) {
      console.error('[CloudBackup] Error backing up service logs:', error);
    }
  } catch (e) {
    console.error('[CloudBackup] Exception in backupServiceLogs:', e);
  }
};

// Backup service definitions to cloud (fire & forget)
export const backupServiceDefinitions = async (defs: ServiceDefinition[], userId: string): Promise<void> => {
  try {
    const vehicleId = await getOrCreateVehicleId(userId);
    if (!vehicleId) {
      console.error('[CloudBackup] No vehicle ID for service definitions backup');
      return;
    }

    // Delete all existing service definitions for this vehicle
    await dbClient
      .from('service_definitions')
      .delete()
      .eq('vehicle_id', vehicleId);

    if (defs.length === 0) return;

    // Insert all current definitions
    const defsData = defs.map(def => mapServiceDefToDb(def, userId, vehicleId));
    const { error } = await dbClient
      .from('service_definitions')
      .insert(defsData);

    if (error) {
      console.error('[CloudBackup] Error backing up service definitions:', error);
    }
  } catch (e) {
    console.error('[CloudBackup] Exception in backupServiceDefinitions:', e);
  }
};

// Check if migration has been completed
export const shouldMigrate = (): boolean => {
  return localStorage.getItem(CLOUD_KEYS.MIGRATION_COMPLETED) !== 'true';
};

// Migrate all local data to cloud (first login only)
export const migrateLocalToCloud = async (
  userId: string,
  vehicle: VehicleSettings,
  fuelLogs: FuelLog[],
  serviceLogs: ServiceLog[],
  serviceDefinitions: ServiceDefinition[]
): Promise<void> => {
  try {
    console.log('[CloudBackup] Starting migration to cloud...');

    // Backup all data
    await backupVehicle(vehicle, userId);
    await backupFuelLogs(fuelLogs, userId);
    await backupServiceLogs(serviceLogs, userId);
    await backupServiceDefinitions(serviceDefinitions, userId);

    // Mark migration as completed
    localStorage.setItem(CLOUD_KEYS.MIGRATION_COMPLETED, 'true');
    console.log('[CloudBackup] Migration completed successfully');
  } catch (e) {
    console.error('[CloudBackup] Exception during migration:', e);
  }
};
