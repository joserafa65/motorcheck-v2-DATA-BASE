/*
  # Create Initial MotorCheck Database Schema

  ## Overview
  This migration creates the core database structure for MotorCheck app, which allows users to track vehicle maintenance, fuel consumption, and service history.

  ## 1. New Tables

  ### `vehicles`
  Stores vehicle information for each user. A user can have multiple vehicles.
  - `id` (uuid, primary key) - Unique identifier for the vehicle
  - `user_id` (uuid, foreign key) - References auth.users, owner of the vehicle
  - `brand` (text) - Vehicle brand/manufacturer (e.g., "Toyota")
  - `model` (text) - Vehicle model (e.g., "Corolla")
  - `year` (text) - Manufacturing year
  - `plate` (text) - License plate number
  - `current_odometer` (integer) - Current odometer reading in km or miles
  - `fuel_type` (text) - Type of fuel used (e.g., "gasoline", "diesel")
  - `oil_type_engine` (text) - Engine oil specification
  - `oil_type_transmission` (text) - Transmission oil specification
  - `unit_system` (text) - Measurement system preference ("km_gal" or "mi_gal")
  - `photo_url` (text) - URL to vehicle photo in Supabase Storage
  - `theme` (text) - UI theme preference ("dark" or "light")
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ### `fuel_logs`
  Tracks fuel refills for each vehicle.
  - `id` (uuid, primary key) - Unique identifier for the fuel log
  - `vehicle_id` (uuid, foreign key) - References vehicles table
  - `user_id` (uuid, foreign key) - References auth.users for RLS
  - `date` (timestamptz) - Date of refill
  - `odometer` (integer) - Odometer reading at refill
  - `volume` (numeric) - Amount of fuel added
  - `price_per_unit` (numeric) - Price per liter/gallon
  - `total_cost` (numeric) - Total cost of refill
  - `fuel_type` (text) - Type of fuel used
  - `is_full_tank` (boolean) - Whether the tank was filled completely
  - `receipt_photo_url` (text) - URL to receipt photo in Supabase Storage
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ### `service_definitions`
  Defines maintenance services and their intervals for each vehicle.
  - `id` (text) - Service type identifier (e.g., "oil_change")
  - `vehicle_id` (uuid, foreign key) - References vehicles table
  - `user_id` (uuid, foreign key) - References auth.users for RLS
  - `name` (text) - Display name of the service
  - `interval_km` (integer) - Service interval in kilometers/miles
  - `interval_months` (integer) - Service interval in months
  - `notes` (text) - Additional notes about the service
  - `next_due_odometer` (integer) - Calculated next service due odometer
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp
  - Primary Key: (vehicle_id, id) - Composite key

  ### `service_logs`
  Records completed maintenance services.
  - `id` (uuid, primary key) - Unique identifier for the service log
  - `vehicle_id` (uuid, foreign key) - References vehicles table
  - `user_id` (uuid, foreign key) - References auth.users for RLS
  - `service_id` (text) - Type of service performed
  - `service_name` (text) - Display name of the service
  - `date` (timestamptz) - Date service was performed
  - `odometer` (integer) - Odometer reading at service
  - `cost` (numeric) - Cost of the service
  - `notes` (text) - Additional notes about the service
  - `receipt_photo_url` (text) - URL to receipt photo in Supabase Storage
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ## 2. Indexes
  Created for frequently queried columns to optimize performance:
  - `vehicles`: user_id
  - `fuel_logs`: vehicle_id, user_id, date (descending)
  - `service_definitions`: user_id
  - `service_logs`: vehicle_id, user_id, date (descending)

  ## 3. Important Notes
  - **Multiple Vehicles**: Users can have multiple vehicles (no UNIQUE constraint on user_id)
  - **Image Storage**: Photo URLs reference Supabase Storage, NOT base64 or binary data
  - **Cascading Deletes**: When a vehicle is deleted, all related logs are deleted
  - **RLS**: Row Level Security will be enabled in a separate migration
*/

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year TEXT,
  plate TEXT,
  current_odometer INTEGER DEFAULT 0,
  fuel_type TEXT,
  oil_type_engine TEXT,
  oil_type_transmission TEXT,
  unit_system TEXT DEFAULT 'km_gal',
  photo_url TEXT,
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);

-- Create fuel_logs table
CREATE TABLE IF NOT EXISTS fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  odometer INTEGER NOT NULL,
  volume NUMERIC(10,2) NOT NULL,
  price_per_unit NUMERIC(10,2),
  total_cost NUMERIC(10,2),
  fuel_type TEXT,
  is_full_tank BOOLEAN DEFAULT false,
  receipt_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle_id ON fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_user_id ON fuel_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_date ON fuel_logs(date DESC);

-- Create service_definitions table
CREATE TABLE IF NOT EXISTS service_definitions (
  id TEXT NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  interval_km INTEGER NOT NULL,
  interval_months INTEGER DEFAULT 0,
  notes TEXT,
  next_due_odometer INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (vehicle_id, id)
);

CREATE INDEX IF NOT EXISTS idx_service_defs_user_id ON service_definitions(user_id);

-- Create service_logs table
CREATE TABLE IF NOT EXISTS service_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  odometer INTEGER NOT NULL,
  cost NUMERIC(10,2),
  notes TEXT,
  receipt_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_logs_vehicle_id ON service_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_service_logs_user_id ON service_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_service_logs_date ON service_logs(date DESC);