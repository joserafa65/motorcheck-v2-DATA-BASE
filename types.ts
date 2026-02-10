
export enum UnitSystem {
  KM_GAL = 'km/gal',
  KM_LITER = 'km/l',
  LITER_100KM = 'l/100km'
}

export type Theme = 'dark' | 'light';

export interface VehicleSettings {
  brand: string;
  model: string;
  year: string;
  plate: string;
  currentOdometer: number;
  fuelType: string;
  oilTypeEngine: string;
  oilTypeTransmission: string;
  unitSystem: UnitSystem;
  photoUrl?: string;
  theme: Theme;
}

export interface FuelLog {
  id: string;
  date: string; // ISO string
  odometer: number;
  volume: number; // stored in liters or gallons
  pricePerUnit: number;
  totalCost: number;
  fuelType?: string; 
  isFullTank: boolean;
  receiptPhoto?: string; // Base64 compressed string
}

export interface ServiceDefinition {
  id: string;
  name: string;
  intervalKm: number;
  intervalMonths: number;
  notes?: string;
  nextDueOdometer?: number; // Explicit target set by user
}

export interface ServiceLog {
  id: string;
  serviceId: string; // References ServiceDefinition
  serviceName: string; // Snapshot name
  date: string;
  odometer: number;
  cost: number;
  notes: string;
  receiptPhoto?: string; // Base64 compressed string
}

export interface ServiceStatus {
  serviceId: string;
  name: string;
  lastPerformedDate: string | null;
  lastPerformedOdometer: number | null;
  nextDueDate: string | null;
  nextDueOdometer: number | null;
  status: 'ok' | 'warning' | 'danger'; // Green, Yellow, Red
  daysLeft: number;
  kmLeft: number;
}

export const PREDEFINED_SERVICES_GAS: ServiceDefinition[] = [
  { id: 'oil_engine', name: 'Cambio de aceite y filtro', intervalKm: 5000, intervalMonths: 6 },
  { id: 'filter_air', name: 'Filtro de aire', intervalKm: 10000, intervalMonths: 12 },
  { id: 'filter_fuel', name: 'Filtro de gasolina', intervalKm: 20000, intervalMonths: 24 },
  { id: 'spark_plugs', name: 'Bujías', intervalKm: 30000, intervalMonths: 24 },
  { id: 'brakes_check', name: 'Revisión de frenos', intervalKm: 10000, intervalMonths: 12 },
  { id: 'tires_rotate', name: 'Rotación de llantas', intervalKm: 10000, intervalMonths: 6 },
  { id: 'battery', name: 'Revisión de batería (12V)', intervalKm: 15000, intervalMonths: 12 },
];

export const DEFAULT_VEHICLE: VehicleSettings = {
  brand: '',
  model: '',
  year: '',
  plate: '',
  currentOdometer: 0,
  fuelType: 'Gasolina',
  oilTypeEngine: '',
  oilTypeTransmission: '',
  unitSystem: UnitSystem.KM_GAL,
  theme: 'dark'
};