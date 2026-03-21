
import { dbClient } from './database';
import { FuelLog, ServiceLog, VehicleSettings, ServiceDefinition, UnitSystem, Theme } from '../types';

const CLOUD_KEYS = {
  VEHICLE_ID: 'motorcheck_cloud_vehicle_id',
  MIGRATION_COMPLETED: 'motorcheck_cloud_migration_completed'
};

// Ensure vehicle exists in cloud and return its ID. Creates if missing.
const ensureVehicleId = async (vehicle: VehicleSettings, userId: string): Promise<string | null> => {
  try {
    const cachedId = localStorage.getItem(CLOUD_KEYS.VEHICLE_ID);
    if (cachedId) return cachedId;

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

    // Vehicle does not exist — create it now
    const vehicleData = mapVehicleToDb(vehicle, userId);
    const { data: created, error: createError } = await dbClient
      .from('vehicles')
      .insert([vehicleData])
      .select('id');

    if (createError) {
      console.error('[CloudBackup] Error creating vehicle:', createError);
      return null;
    }

    if (created && created.length > 0) {
      const newId = created[0].id;
      localStorage.setItem(CLOUD_KEYS.VEHICLE_ID, newId);
      console.log('[CloudBackup] Vehicle created with id:', newId);
      return newId;
    }

    return null;
  } catch (e) {
    console.error('[CloudBackup] Exception in ensureVehicleId:', e);
    return null;
  }
};

// Get vehicle_id from cache or cloud only (no create)
const getVehicleId = async (userId: string): Promise<string | null> => {
  try {
    const cachedId = localStorage.getItem(CLOUD_KEYS.VEHICLE_ID);
    if (cachedId) return cachedId;

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
    console.error('[CloudBackup] Exception in getVehicleId:', e);
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
  photo_url: vehicle.photoUrl?.startsWith('http') ? vehicle.photoUrl : null,
  theme: vehicle.theme,
  updated_at: new Date().toISOString()
});

// Map local FuelLog to database format
const mapFuelLogToDb = (log: FuelLog, userId: string, vehicleId: string) => ({
  external_id: log.id,
  vehicle_id: vehicleId,
  user_id: userId,
  date: log.date ?? new Date().toISOString(),
  odometer: log.odometer ?? 0,
  volume: log.volume ?? 0,
  price_per_unit: log.pricePerUnit ?? 0,
  total_cost: log.totalCost ?? 0,
  fuel_type: log.fuelType || null,
  is_full_tank: log.isFullTank ?? false,
  receipt_photo_url: log.receiptPhotoUrl || null,
  updated_at: new Date().toISOString()
});

// Map local ServiceLog to database format
const mapServiceLogToDb = (log: ServiceLog, userId: string, vehicleId: string) => ({
  external_id: log.id,
  vehicle_id: vehicleId,
  user_id: userId,
  service_id: log.serviceName || 'service',
  service_name: log.serviceName,
  date: log.date,
  odometer: log.odometer,
  cost: log.cost,
  notes: log.notes,
  receipt_photo_url: log.receiptPhotoUrl || null,
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

// Backup vehicle to cloud — always upserts, caches vehicle_id
export const backupVehicle = async (vehicle: VehicleSettings, userId: string): Promise<void> => {
  try {
    const vehicleId = await ensureVehicleId(vehicle, userId);
    if (!vehicleId) {
      console.warn('[CloudBackup] Skipping vehicle backup — could not resolve vehicle_id');
      return;
    }

    const vehicleData = mapVehicleToDb(vehicle, userId);
    const { error } = await dbClient
      .from('vehicles')
      .update(vehicleData)
      .eq('id', vehicleId);

    if (error) {
      console.error('[CloudBackup] Error updating vehicle:', error);
    }
  } catch (e) {
    console.error('[CloudBackup] Exception in backupVehicle:', e);
  }
};

// Backup fuel logs to cloud
export const backupFuelLogs = async (logs: FuelLog[], userId: string): Promise<void> => {
  try {
    const vehicleId = await getVehicleId(userId);
    if (!vehicleId) {
      console.warn('[CloudBackup] Skipping fuel logs backup — missing vehicle_id');
      return;
    }

    if (logs.length === 0) return;

    // Deduplicate by external_id (keep last occurrence)
    const seen = new Map<string, FuelLog>();
    for (const log of logs) seen.set(log.id, log);
    const unique = Array.from(seen.values());

    const logsData = unique.map(log => mapFuelLogToDb(log, userId, vehicleId));
    const { error } = await dbClient
      .from('fuel_logs')
      .upsert(logsData, { onConflict: 'external_id' });

    if (error) {
      console.error('[CloudBackup] Error backing up fuel logs:', error);
    }
  } catch (e) {
    console.error('[CloudBackup] Exception in backupFuelLogs:', e);
  }
};

// Backup service logs to cloud
export const backupServiceLogs = async (logs: ServiceLog[], userId: string): Promise<void> => {
  try {
    const vehicleId = await getVehicleId(userId);
    if (!vehicleId) {
      console.warn('[CloudBackup] Skipping service logs backup — missing vehicle_id');
      return;
    }

    if (logs.length === 0) return;

    // Deduplicate by external_id (keep last occurrence)
    const seen = new Map<string, ServiceLog>();
    for (const log of logs) seen.set(log.id, log);
    const unique = Array.from(seen.values());

    const logsData = unique.map(log => mapServiceLogToDb(log, userId, vehicleId));
    const { error } = await dbClient
      .from('service_logs')
      .upsert(logsData, { onConflict: 'external_id' });

    if (error) {
      console.error('[CloudBackup] Error backing up service logs:', error);
    }
  } catch (e) {
    console.error('[CloudBackup] Exception in backupServiceLogs:', e);
  }
};

// Backup service definitions to cloud
export const backupServiceDefinitions = async (defs: ServiceDefinition[], userId: string): Promise<void> => {
  try {
    const vehicleId = await getVehicleId(userId);
    if (!vehicleId) {
      console.warn('[CloudBackup] Skipping service definitions backup — missing vehicle_id');
      return;
    }

    if (defs.length === 0) return;

    // Deduplicate by composite key id+vehicle_id (keep last occurrence)
    const seen = new Map<string, ServiceDefinition>();
    for (const def of defs) seen.set(`${def.id}::${vehicleId}`, def);
    const unique = Array.from(seen.values());

    const defsData = unique.map(def => mapServiceDefToDb(def, userId, vehicleId));
    const { error } = await dbClient
      .from('service_definitions')
      .upsert(defsData, { onConflict: 'vehicle_id,id' });

    if (error) {
      console.error('[CloudBackup] Error backing up service definitions:', error);
    }
  } catch (e) {
    console.error('[CloudBackup] Exception in backupServiceDefinitions:', e);
  }
};

export interface RestoreResult {
  vehicle: VehicleSettings | null;
  fuelLogs: FuelLog[];
  serviceLogs: ServiceLog[];
  serviceDefinitions: ServiceDefinition[];
}

// Map DB vehicle row back to local VehicleSettings
const mapDbToVehicle = (row: Record<string, any>): VehicleSettings => ({
  brand: row.brand ?? '',
  model: row.model ?? '',
  year: row.year ?? '',
  plate: row.plate ?? '',
  currentOdometer: row.current_odometer ?? 0,
  fuelType: row.fuel_type ?? 'Gasolina',
  oilTypeEngine: row.oil_type_engine ?? '',
  oilTypeTransmission: row.oil_type_transmission ?? '',
  unitSystem: (row.unit_system as UnitSystem) ?? UnitSystem.KM_GAL,
  photoUrl: row.photo_url ?? undefined,
  theme: (row.theme as Theme) ?? 'dark',
});

// Map DB fuel_log row back to local FuelLog
const mapDbToFuelLog = (row: Record<string, any>): FuelLog => ({
  id: row.external_id ?? row.id,
  date: row.date,
  odometer: row.odometer ?? 0,
  volume: parseFloat(row.volume) ?? 0,
  pricePerUnit: parseFloat(row.price_per_unit) ?? 0,
  totalCost: parseFloat(row.total_cost) ?? 0,
  fuelType: row.fuel_type ?? undefined,
  isFullTank: row.is_full_tank ?? false,
  receiptPhotoUrl: row.receipt_photo_url ?? undefined,
});

// Map DB service_log row back to local ServiceLog
const mapDbToServiceLog = (row: Record<string, any>): ServiceLog => ({
  id: row.external_id ?? row.id,
  serviceId: row.service_id ?? null,
  serviceName: row.service_name ?? '',
  date: row.date,
  odometer: row.odometer ?? 0,
  cost: parseFloat(row.cost) ?? 0,
  notes: row.notes ?? '',
  receiptPhotoUrl: row.receipt_photo_url ?? undefined,
});

// Map DB service_definition row back to local ServiceDefinition
const mapDbToServiceDef = (row: Record<string, any>): ServiceDefinition => ({
  id: row.id,
  name: row.name ?? '',
  intervalKm: row.interval_km ?? 0,
  intervalMonths: row.interval_months ?? 0,
  notes: row.notes ?? undefined,
  nextDueOdometer: row.next_due_odometer ?? undefined,
});

// Restore all cloud data for a user. Returns null values if nothing found.
export const restoreFromCloud = async (userId: string): Promise<RestoreResult> => {
  const empty: RestoreResult = { vehicle: null, fuelLogs: [], serviceLogs: [], serviceDefinitions: [] };

  try {
    console.log('[CloudBackup] RESTORE START', userId);

    const { data: vehicleRows, error: vehicleError } = await dbClient
      .from('vehicles')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (vehicleError) {
      console.error('[CloudBackup] Error fetching vehicle:', vehicleError);
      return empty;
    }

    if (!vehicleRows || vehicleRows.length === 0) {
      console.log('[CloudBackup] No cloud data found for user');
      return empty;
    }

    const vehicleRow = vehicleRows[0];
    const vehicleId = vehicleRow.id;
    localStorage.setItem(CLOUD_KEYS.VEHICLE_ID, vehicleId);

    console.log('[CloudBackup] Vehicle from DB:', vehicleRow);

    const [fuelRes, serviceLogsRes, serviceDefsRes] = await Promise.all([
      dbClient.from('fuel_logs').select('*').eq('user_id', userId),
      dbClient.from('service_logs').select('*').eq('user_id', userId),
      dbClient.from('service_definitions').select('*').eq('user_id', userId),
    ]);

    if (fuelRes.error) console.error('[CloudBackup] Error fetching fuel logs:', fuelRes.error);
    if (serviceLogsRes.error) console.error('[CloudBackup] Error fetching service logs:', serviceLogsRes.error);
    if (serviceDefsRes.error) console.error('[CloudBackup] Error fetching service definitions:', serviceDefsRes.error);

    const fuelLogsData = fuelRes.data ?? [];
    const serviceLogsData = serviceLogsRes.data ?? [];

    console.log('[CloudBackup] Fuel logs from DB:', fuelLogsData.length);
    console.log('[CloudBackup] Service logs from DB:', serviceLogsData.length);

    return {
      vehicle: mapDbToVehicle(vehicleRow),
      fuelLogs: fuelLogsData.map(mapDbToFuelLog),
      serviceLogs: serviceLogsData.map(mapDbToServiceLog),
      serviceDefinitions: (serviceDefsRes.data ?? []).map(mapDbToServiceDef),
    };
  } catch (e) {
    console.error('[CloudBackup] Exception in restoreFromCloud:', e);
    return empty;
  }
};

// Check if migration has been completed
export const shouldMigrate = (): boolean => {
  return localStorage.getItem(CLOUD_KEYS.MIGRATION_COMPLETED) !== 'true';
};

// Migrate all local data to cloud (first login only).
// Vehicle is created first; logs only proceed if vehicle_id is confirmed.
export const migrateLocalToCloud = async (
  userId: string,
  vehicle: VehicleSettings,
  fuelLogs: FuelLog[],
  serviceLogs: ServiceLog[],
  serviceDefinitions: ServiceDefinition[]
): Promise<void> => {
  try {
    console.log('[CloudBackup] Starting migration to cloud...');

    // Step 1: ensure vehicle exists and get its ID
    const vehicleId = await ensureVehicleId(vehicle, userId);
    if (!vehicleId) {
      console.error('[CloudBackup] Migration aborted — could not create/resolve vehicle_id');
      return;
    }

    // Step 2: update vehicle data now that we have the ID
    await backupVehicle(vehicle, userId);

    // Step 3: backup logs only after vehicle is confirmed
    await backupFuelLogs(fuelLogs, userId);
    await backupServiceLogs(serviceLogs, userId);
    await backupServiceDefinitions(serviceDefinitions, userId);

    localStorage.setItem(CLOUD_KEYS.MIGRATION_COMPLETED, 'true');
    console.log('[CloudBackup] Migration completed successfully');
  } catch (e) {
    console.error('[CloudBackup] Exception during migration:', e);
  }
};
