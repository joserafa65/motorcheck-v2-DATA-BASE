
import { FuelLog, ServiceLog, VehicleSettings, ServiceDefinition, PREDEFINED_SERVICES_GAS, DEFAULT_VEHICLE } from '../types';

const KEYS = {
  VEHICLE: 'motorcheck_vehicle',
  FUEL_LOGS: 'motorcheck_fuel',
  SERVICE_LOGS: 'motorcheck_services',
  SERVICE_DEFS: 'motorcheck_service_defs',
  ONBOARDING_COMPLETED: 'motorcheck_onboarding_completed',
  AUTH_COMPLETED: 'motorcheck_auth_completed',
};

export const StorageService = {
  getVehicle: (): VehicleSettings => {
    try {
      const data = localStorage.getItem(KEYS.VEHICLE);
      // Merge with DEFAULT_VEHICLE to ensure new properties exist
      return data ? { ...DEFAULT_VEHICLE, ...JSON.parse(data) } : DEFAULT_VEHICLE;
    } catch (e) {
      console.error("Error loading vehicle data", e);
      return DEFAULT_VEHICLE;
    }
  },
  saveVehicle: (vehicle: VehicleSettings) => {
    try {
      localStorage.setItem(KEYS.VEHICLE, JSON.stringify(vehicle));
    } catch (e) {
      console.error("Error saving vehicle data", e);
    }
  },
  getFuelLogs: (): FuelLog[] => {
    try {
      const data = localStorage.getItem(KEYS.FUEL_LOGS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Error loading fuel logs", e);
      return [];
    }
  },
  saveFuelLogs: (logs: FuelLog[]) => {
    try {
      localStorage.setItem(KEYS.FUEL_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error("Error saving fuel logs", e);
    }
  },
  getServiceLogs: (): ServiceLog[] => {
    try {
      const data = localStorage.getItem(KEYS.SERVICE_LOGS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Error loading service logs", e);
      return [];
    }
  },
  saveServiceLogs: (logs: ServiceLog[]) => {
    try {
      localStorage.setItem(KEYS.SERVICE_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error("Error saving service logs", e);
    }
  },
  getServiceDefinitions: (): ServiceDefinition[] => {
    try {
      const data = localStorage.getItem(KEYS.SERVICE_DEFS);
      return data ? JSON.parse(data) : PREDEFINED_SERVICES_GAS;
    } catch (e) {
      console.error("Error loading service definitions", e);
      return PREDEFINED_SERVICES_GAS;
    }
  },
  saveServiceDefinitions: (defs: ServiceDefinition[]) => {
    try {
      localStorage.setItem(KEYS.SERVICE_DEFS, JSON.stringify(defs));
    } catch (e) {
      console.error("Error saving service definitions", e);
    }
  },
  clearAll: () => {
    localStorage.removeItem(KEYS.VEHICLE);
    localStorage.removeItem(KEYS.FUEL_LOGS);
    localStorage.removeItem(KEYS.SERVICE_LOGS);
    localStorage.removeItem(KEYS.SERVICE_DEFS);
  },
  hasCompletedOnboarding: (): boolean => {
    try {
      return localStorage.getItem(KEYS.ONBOARDING_COMPLETED) === 'true';
    } catch (e) {
      return false;
    }
  },
  setOnboardingCompleted: () => {
    try {
      localStorage.setItem(KEYS.ONBOARDING_COMPLETED, 'true');
    } catch (e) {
      console.error("Error saving onboarding status", e);
    }
  },
  hasCompletedAuth: (): boolean => {
    try {
      return localStorage.getItem(KEYS.AUTH_COMPLETED) === 'true';
    } catch (e) {
      return false;
    }
  },
  setAuthCompleted: () => {
    try {
      localStorage.setItem(KEYS.AUTH_COMPLETED, 'true');
    } catch (e) {
      console.error("Error saving auth status", e);
    }
  }
};
