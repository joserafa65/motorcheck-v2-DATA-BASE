
import { dbClient } from './database';
import { FuelLog, ServiceLog, VehicleSettings, ServiceDefinition, UnitSystem, Theme } from '../types';
import {
  enqueueVehicleUpsert,
  enqueueFuelLogUpsert,
  enqueueServiceLogUpsert,
  enqueueServiceDefUpsert,
  enqueueFuelLogDelete,
  enqueueServiceLogDelete,
  enqueueServiceDefDelete,
} from './offlineQueue';

const CLOUD_KEYS = {
  VEHICLE_ID: 'motorcheck_cloud_vehicle_id',
  MIGRATION_COMPLETED: 'motorcheck_cloud_migration_completed'
};

// In-memory cache to avoid redundant Supabase queries within a session
let cachedVehicleId: string | null = null;

// Mutex to prevent concurrent ensureVehicleId calls from each inserting a new row
let ensureVehicleIdPromise: Promise<string | null> | null = null;

export const getCachedVehicleId = (): string | null => {
  if (cachedVehicleId) return cachedVehicleId;
  const stored = localStorage.getItem(CLOUD_KEYS.VEHICLE_ID);
  if (stored) {
    cachedVehicleId = stored;
    console.log('[CloudBackup] Using cached vehicle_id:', cachedVehicleId);
  }
  return cachedVehicleId;
};

const setCachedVehicleId = (id: string): void => {
  cachedVehicleId = id;
  localStorage.setItem(CLOUD_KEYS.VEHICLE_ID, id);
};

export const clearCachedVehicleId = (): void => {
  cachedVehicleId = null;
  ensureVehicleIdPromise = null;
  localStorage.removeItem(CLOUD_KEYS.VEHICLE_ID);
};

// Ensure vehicle exists in cloud and return its ID. Creates if missing.
// Uses a shared promise to prevent concurrent callers from each inserting a new row.
const ensureVehicleId = (vehicle: VehicleSettings, userId: string): Promise<string | null> => {
  const cached = getCachedVehicleId();
  if (cached) return Promise.resolve(cached);

  if (ensureVehicleIdPromise) return ensureVehicleIdPromise;

  ensureVehicleIdPromise = (async () => {
    try {
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
        setCachedVehicleId(vehicleId);
        return vehicleId;
      }

      // Re-query before inserting — two devices can both see length===0 from the
      // first query if they race; this second check is still inside the mutex so
      // only one device ends up inserting.
      const { data: recheck } = await dbClient
        .from('vehicles')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (recheck && recheck.length > 0) {
        const vehicleId = recheck[0].id;
        setCachedVehicleId(vehicleId);
        console.log('[CloudBackup] Vehicle found on recheck (cross-device race prevented):', vehicleId);
        return vehicleId;
      }

      // Confirmed no vehicle exists — safe to insert
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
        setCachedVehicleId(newId);
        console.log('[CloudBackup] Vehicle created with id:', newId);
        return newId;
      }

      return null;
    } catch (e) {
      console.error('[CloudBackup] Exception in ensureVehicleId:', e);
      return null;
    } finally {
      ensureVehicleIdPromise = null;
    }
  })();

  return ensureVehicleIdPromise;
};

// Retry a backup operation once after a delay if the first attempt fails.
// If both attempts fail, calls onPermanentFailure (used to enqueue for offline replay)
// and then calls onError (used to show a toast).
const withRetry = async (
  label: string,
  fn: () => Promise<boolean>,
  onError?: () => void,
  onPermanentFailure?: () => void
): Promise<void> => {
  const ok = await fn();
  if (ok) return;

  console.warn(`[CloudBackup] ${label} failed — retrying in 4 s`);
  await new Promise(resolve => setTimeout(resolve, 4000));

  const ok2 = await fn();
  if (!ok2) {
    console.error(`[CloudBackup] ${label} failed after retry — enqueueing for offline replay`);
    onPermanentFailure?.();
    onError?.();
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

// Backup vehicle to cloud — ensures vehicle_id exists first, then updates.
export const backupVehicle = async (
  vehicle: VehicleSettings,
  userId: string,
  onError?: () => void
): Promise<void> => {
  let vehicleIdForQueue: string | null = null;
  let vehicleDataForQueue: Record<string, any> | null = null;

  await withRetry('backupVehicle', async () => {
    try {
      console.log('[CloudBackup] Starting vehicle backup');
      const vehicleId = await ensureVehicleId(vehicle, userId);
      if (!vehicleId) {
        console.error('[CloudBackup] Backup aborted: missing vehicle_id');
        return false;
      }

      const vehicleData = mapVehicleToDb(vehicle, userId);
      vehicleIdForQueue = vehicleId;
      vehicleDataForQueue = vehicleData;

      const { error } = await dbClient
        .from('vehicles')
        .update(vehicleData)
        .eq('id', vehicleId);

      if (error) {
        console.error('[CloudBackup] Error updating vehicle:', error);
        return false;
      }

      console.log('[CloudBackup] vehicle backup success');
      return true;
    } catch (e) {
      console.error('[CloudBackup] Exception in backupVehicle:', e);
      return false;
    }
  }, onError, () => {
    if (vehicleIdForQueue && vehicleDataForQueue) {
      enqueueVehicleUpsert(vehicleDataForQueue, vehicleIdForQueue);
    }
  });
};

// Backup fuel logs to cloud.
// Uses ensureVehicleId so a vehicle row is created first if it doesn't exist yet,
// fixing the race condition on new devices where fuel logs were saved before the
// vehicle backup had finished creating the row.
export const backupFuelLogs = async (
  logs: FuelLog[],
  userId: string,
  vehicle: VehicleSettings,
  onError?: () => void
): Promise<void> => {
  if (logs.length === 0) return;

  let logsDataForQueue: Record<string, any>[] | null = null;

  await withRetry('backupFuelLogs', async () => {
    try {
      console.log(`[CloudBackup] Starting fuel_logs backup: ${logs.length} items`);

      const vehicleId = await ensureVehicleId(vehicle, userId);
      if (!vehicleId) {
        console.error('[CloudBackup] Backup aborted: missing vehicle_id');
        return false;
      }

      // Deduplicate by external_id
      const seen = new Map<string, FuelLog>();
      for (const log of logs) seen.set(log.id, log);
      const unique = Array.from(seen.values());

      console.log(`[CloudBackup] Fuel logs after dedup: ${unique.length}`);

      const logsData = unique.map(log => mapFuelLogToDb(log, userId, vehicleId));
      logsDataForQueue = logsData;

      const { error } = await dbClient
        .from('fuel_logs')
        .upsert(logsData, { onConflict: 'external_id' });

      if (error) {
        console.error('[CloudBackup] Error backing up fuel logs:', error);
        return false;
      }

      console.log('[CloudBackup] fuel_logs backup success');
      return true;
    } catch (e) {
      console.error('[CloudBackup] Exception in backupFuelLogs:', e);
      return false;
    }
  }, onError, () => {
    if (logsDataForQueue) {
      for (const logData of logsDataForQueue) enqueueFuelLogUpsert(logData);
    }
  });
};

// Backup service logs to cloud.
export const backupServiceLogs = async (
  logs: ServiceLog[],
  userId: string,
  vehicle: VehicleSettings,
  onError?: () => void
): Promise<void> => {
  if (logs.length === 0) return;

  let logsDataForQueue: Record<string, any>[] | null = null;

  await withRetry('backupServiceLogs', async () => {
    try {
      console.log(`[CloudBackup] Starting service_logs backup: ${logs.length} items`);

      const vehicleId = await ensureVehicleId(vehicle, userId);
      if (!vehicleId) {
        console.error('[CloudBackup] Backup aborted: missing vehicle_id');
        return false;
      }

      // Deduplicate by external_id
      const seen = new Map<string, ServiceLog>();
      for (const log of logs) seen.set(log.id, log);
      const unique = Array.from(seen.values());

      console.log(`[CloudBackup] Service logs after dedup: ${unique.length}`);

      const logsData = unique.map(log => mapServiceLogToDb(log, userId, vehicleId));
      logsDataForQueue = logsData;

      const { error } = await dbClient
        .from('service_logs')
        .upsert(logsData, { onConflict: 'external_id' });

      if (error) {
        console.error('[CloudBackup] Error backing up service logs:', error);
        return false;
      }

      console.log('[CloudBackup] service_logs backup success');
      return true;
    } catch (e) {
      console.error('[CloudBackup] Exception in backupServiceLogs:', e);
      return false;
    }
  }, onError, () => {
    if (logsDataForQueue) {
      for (const logData of logsDataForQueue) enqueueServiceLogUpsert(logData);
    }
  });
};

// Backup service definitions to cloud.
export const backupServiceDefinitions = async (
  defs: ServiceDefinition[],
  userId: string,
  vehicle: VehicleSettings,
  onError?: () => void
): Promise<void> => {
  if (defs.length === 0) return;

  let defsDataForQueue: Record<string, any>[] | null = null;

  await withRetry('backupServiceDefinitions', async () => {
    try {
      console.log(`[CloudBackup] Starting service_definitions backup: ${defs.length} items`);

      const vehicleId = await ensureVehicleId(vehicle, userId);
      if (!vehicleId) {
        console.error('[CloudBackup] Backup aborted: missing vehicle_id');
        return false;
      }

      // Deduplicate by composite key id + vehicle_id
      const seen = new Map<string, ServiceDefinition>();
      for (const def of defs) seen.set(`${def.id}::${vehicleId}`, def);
      const unique = Array.from(seen.values());

      console.log(`[CloudBackup] Service definitions after dedup: ${unique.length}`);

      const defsData = unique.map(def => mapServiceDefToDb(def, userId, vehicleId));
      defsDataForQueue = defsData;

      const { error } = await dbClient
        .from('service_definitions')
        .upsert(defsData, { onConflict: 'vehicle_id,id' });

      if (error) {
        console.error('[CloudBackup] Error backing up service definitions:', error);
        return false;
      }

      console.log('[CloudBackup] service_definitions backup success');
      return true;
    } catch (e) {
      console.error('[CloudBackup] Exception in backupServiceDefinitions:', e);
      return false;
    }
  }, onError, () => {
    if (defsDataForQueue) {
      for (const defData of defsDataForQueue) enqueueServiceDefUpsert(defData);
    }
  });
};

// Hard-delete a single fuel log from Supabase by its external_id.
// Enqueues for offline replay if the delete fails.
export const deleteFuelLogFromCloud = async (id: string, userId: string): Promise<void> => {
  try {
    const { error } = await dbClient
      .from('fuel_logs')
      .delete()
      .eq('external_id', id)
      .eq('user_id', userId);
    if (error) {
      console.error('[CloudBackup] Error deleting fuel log:', error);
      enqueueFuelLogDelete(id, userId);
    }
  } catch (e) {
    console.error('[CloudBackup] Exception deleting fuel log:', e);
    enqueueFuelLogDelete(id, userId);
  }
};

// Hard-delete a single service log from Supabase by its external_id.
// Enqueues for offline replay if the delete fails.
export const deleteServiceLogFromCloud = async (id: string, userId: string): Promise<void> => {
  try {
    const { error } = await dbClient
      .from('service_logs')
      .delete()
      .eq('external_id', id)
      .eq('user_id', userId);
    if (error) {
      console.error('[CloudBackup] Error deleting service log:', error);
      enqueueServiceLogDelete(id, userId);
    }
  } catch (e) {
    console.error('[CloudBackup] Exception deleting service log:', e);
    enqueueServiceLogDelete(id, userId);
  }
};

// Hard-delete a single service definition from Supabase.
// Scoped by vehicle_id (part of the composite PK) to avoid deleting the same
// service type from a different vehicle if multi-vehicle support is ever added.
// Enqueues for offline replay if the delete fails.
export const deleteServiceDefinitionFromCloud = async (id: string, userId: string, vehicleId: string): Promise<void> => {
  try {
    const { error } = await dbClient
      .from('service_definitions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .eq('vehicle_id', vehicleId);
    if (error) {
      console.error('[CloudBackup] Error deleting service definition:', error);
      enqueueServiceDefDelete(id, userId, vehicleId);
    }
  } catch (e) {
    console.error('[CloudBackup] Exception deleting service definition:', e);
    enqueueServiceDefDelete(id, userId, vehicleId);
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
    setCachedVehicleId(vehicleId);

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

    // Mark migration complete immediately so a failed network attempt doesn't
    // re-run migration on every subsequent login. Any failed writes are queued
    // for offline replay automatically via the withRetry + enqueue path.
    localStorage.setItem(CLOUD_KEYS.MIGRATION_COMPLETED, 'true');

    // Step 1: ensure vehicle exists and get its ID before anything else
    const vehicleId = await ensureVehicleId(vehicle, userId);
    if (!vehicleId) {
      console.error('[CloudBackup] Migration aborted: missing vehicle_id');
      return;
    }

    // Step 2: update vehicle data now that ID is confirmed
    await backupVehicle(vehicle, userId);

    // Step 3: backup logs only after vehicle is confirmed
    await backupFuelLogs(fuelLogs, userId, vehicle);
    await backupServiceLogs(serviceLogs, userId, vehicle);
    await backupServiceDefinitions(serviceDefinitions, userId, vehicle);

    console.log('[CloudBackup] Migration completed successfully');
  } catch (e) {
    console.error('[CloudBackup] Exception during migration:', e);
  }
};
