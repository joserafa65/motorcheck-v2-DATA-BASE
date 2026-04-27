import { dbClient } from './database';
import { FuelLog, ServiceLog, VehicleSettings, ServiceDefinition } from '../types';

const QUEUE_KEY = 'motorcheck_offline_queue';

export type QueueItemType = 'vehicle' | 'fuelLog' | 'serviceLog' | 'serviceDefinition';
export type QueueOperation = 'upsert' | 'delete';

export interface QueueItem {
  id: string;
  type: QueueItemType;
  operation: QueueOperation;
  payload: Record<string, any>;
  timestamp: number;
}

// Listeners notified whenever the queue length changes
const listeners = new Set<(count: number) => void>();

export const onQueueChange = (fn: (count: number) => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = () => {
  const count = getQueue().length;
  listeners.forEach(fn => fn(count));
};

const randomId = () => Math.random().toString(36).slice(2, 10);

// --- Queue storage ---

export const getQueue = (): QueueItem[] => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveQueue = (queue: QueueItem[]): void => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const enqueue = (type: QueueItemType, operation: QueueOperation, payload: Record<string, any>): void => {
  const queue = getQueue();

  if (operation === 'upsert') {
    // For upsert operations, replace any existing item with the same type+id key
    // so we don't accumulate stale versions of the same record.
    const key = deriveKey(type, payload);
    const idx = queue.findIndex(item => item.operation === 'upsert' && deriveKey(item.type, item.payload) === key);
    const newItem: QueueItem = { id: randomId(), type, operation, payload, timestamp: Date.now() };
    if (idx !== -1) {
      queue[idx] = newItem;
    } else {
      queue.push(newItem);
    }
  } else {
    // delete — always append; duplicates are harmless (idempotent)
    queue.push({ id: randomId(), type, operation, payload, timestamp: Date.now() });
  }

  saveQueue(queue);
  notify();
  console.log(`[OfflineQueue] Enqueued ${operation} ${type}. Queue size: ${queue.length}`);
};

const removeItem = (itemId: string): void => {
  const queue = getQueue().filter(i => i.id !== itemId);
  saveQueue(queue);
  notify();
};

export const clearQueue = (): void => {
  saveQueue([]);
  notify();
};

// Derive a deduplication key for upsert items so newer state replaces older state.
const deriveKey = (type: QueueItemType, payload: Record<string, any>): string => {
  switch (type) {
    case 'vehicle':    return `vehicle::${payload.user_id}`;
    case 'fuelLog':    return `fuelLog::${payload.external_id}`;
    case 'serviceLog': return `serviceLog::${payload.external_id}`;
    case 'serviceDefinition': return `serviceDef::${payload.vehicle_id}::${payload.id}`;
    default:           return `unknown::${Date.now()}`;
  }
};

// --- Replay ---

let isReplaying = false;

export const replayQueue = async (): Promise<void> => {
  if (isReplaying) return;
  const queue = getQueue();
  if (queue.length === 0) return;

  isReplaying = true;
  console.log(`[OfflineQueue] Replaying ${queue.length} queued item(s)…`);

  for (const item of queue) {
    const success = await executeItem(item);
    if (success) {
      removeItem(item.id);
      console.log(`[OfflineQueue] Replayed ${item.operation} ${item.type} (${item.id})`);
    } else {
      console.warn(`[OfflineQueue] Replay failed for ${item.operation} ${item.type} (${item.id}) — will retry next online event`);
    }
  }

  isReplaying = false;
};

const executeItem = async (item: QueueItem): Promise<boolean> => {
  try {
    if (item.operation === 'upsert') {
      return await executeUpsert(item);
    } else {
      return await executeDelete(item);
    }
  } catch (e) {
    console.error('[OfflineQueue] Exception executing item:', e);
    return false;
  }
};

const executeUpsert = async (item: QueueItem): Promise<boolean> => {
  const p = item.payload;
  switch (item.type) {
    case 'vehicle': {
      const { error } = await dbClient.from('vehicles').update(p).eq('id', p.vehicle_db_id);
      return !error;
    }
    case 'fuelLog': {
      const { error } = await dbClient.from('fuel_logs').upsert([p], { onConflict: 'external_id' });
      return !error;
    }
    case 'serviceLog': {
      const { error } = await dbClient.from('service_logs').upsert([p], { onConflict: 'external_id' });
      return !error;
    }
    case 'serviceDefinition': {
      const { error } = await dbClient.from('service_definitions').upsert([p], { onConflict: 'vehicle_id,id' });
      return !error;
    }
    default:
      return false;
  }
};

const executeDelete = async (item: QueueItem): Promise<boolean> => {
  const p = item.payload;
  switch (item.type) {
    case 'fuelLog': {
      const { error } = await dbClient.from('fuel_logs').delete().eq('external_id', p.external_id).eq('user_id', p.user_id);
      return !error;
    }
    case 'serviceLog': {
      const { error } = await dbClient.from('service_logs').delete().eq('external_id', p.external_id).eq('user_id', p.user_id);
      return !error;
    }
    case 'serviceDefinition': {
      const { error } = await dbClient
        .from('service_definitions')
        .delete()
        .eq('id', p.id)
        .eq('user_id', p.user_id)
        .eq('vehicle_id', p.vehicle_id);
      return !error;
    }
    default:
      return false;
  }
};

// --- Online listener (registered once globally) ---

let listenerRegistered = false;

export const registerOnlineListener = (): void => {
  if (listenerRegistered || typeof window === 'undefined') return;
  listenerRegistered = true;

  window.addEventListener('online', () => {
    console.log('[OfflineQueue] Connection restored — replaying queue');
    replayQueue();
  });
};

// Helper: enqueue a vehicle upsert (needs vehicle_db_id separately from the
// update payload since we update by the Supabase-side PK, not user_id).
export const enqueueVehicleUpsert = (vehicleData: Record<string, any>, vehicleDbId: string): void => {
  enqueue('vehicle', 'upsert', { ...vehicleData, vehicle_db_id: vehicleDbId });
};

export const enqueueFuelLogUpsert = (logData: Record<string, any>): void => {
  enqueue('fuelLog', 'upsert', logData);
};

export const enqueueServiceLogUpsert = (logData: Record<string, any>): void => {
  enqueue('serviceLog', 'upsert', logData);
};

export const enqueueServiceDefUpsert = (defData: Record<string, any>): void => {
  enqueue('serviceDefinition', 'upsert', defData);
};

export const enqueueFuelLogDelete = (externalId: string, userId: string): void => {
  enqueue('fuelLog', 'delete', { external_id: externalId, user_id: userId });
};

export const enqueueServiceLogDelete = (externalId: string, userId: string): void => {
  enqueue('serviceLog', 'delete', { external_id: externalId, user_id: userId });
};

export const enqueueServiceDefDelete = (id: string, userId: string, vehicleId: string): void => {
  enqueue('serviceDefinition', 'delete', { id, user_id: userId, vehicle_id: vehicleId });
};
