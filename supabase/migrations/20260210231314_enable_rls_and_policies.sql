/*
  # Enable Row Level Security and Create Security Policies

  ## Overview
  This migration enables Row Level Security (RLS) on all tables and creates policies to ensure users can only access their own data.

  ## 1. Enable RLS
  RLS is enabled on all four core tables:
  - vehicles
  - fuel_logs
  - service_definitions
  - service_logs

  ## 2. Security Policies

  ### Vehicles Table Policies
  - **"Users can view own vehicles"** (SELECT): Users can only view their own vehicles
  - **"Users can insert own vehicles"** (INSERT): Users can only create vehicles for themselves
  - **"Users can update own vehicles"** (UPDATE): Users can only update their own vehicles
  - **"Users can delete own vehicles"** (DELETE): Users can only delete their own vehicles

  ### Fuel Logs Table Policies
  - **"Users can view own fuel logs"** (SELECT): Users can only view fuel logs for their vehicles
  - **"Users can insert own fuel logs"** (INSERT): Users can only create fuel logs for themselves
  - **"Users can update own fuel logs"** (UPDATE): Users can only update their own fuel logs
  - **"Users can delete own fuel logs"** (DELETE): Users can only delete their own fuel logs

  ### Service Definitions Table Policies
  - **"Users can view own service defs"** (SELECT): Users can only view their service definitions
  - **"Users can insert own service defs"** (INSERT): Users can only create service definitions for themselves
  - **"Users can update own service defs"** (UPDATE): Users can only update their own service definitions
  - **"Users can delete own service defs"** (DELETE): Users can only delete their own service definitions

  ### Service Logs Table Policies
  - **"Users can view own service logs"** (SELECT): Users can only view their service logs
  - **"Users can insert own service logs"** (INSERT): Users can only create service logs for themselves
  - **"Users can update own service logs"** (UPDATE): Users can only update their own service logs
  - **"Users can delete own service logs"** (DELETE): Users can only delete their own service logs

  ## 3. Security Notes
  - All policies use `auth.uid()` to identify the authenticated user
  - Policies are restrictive by default - users can ONLY access their own data
  - All policies require authentication (`TO authenticated`)
  - INSERT policies use `WITH CHECK`, SELECT/DELETE use `USING`, UPDATE uses both
*/

-- Enable Row Level Security on all tables
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_logs ENABLE ROW LEVEL SECURITY;

-- Vehicles table policies
CREATE POLICY "Users can view own vehicles" 
  ON vehicles FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vehicles" 
  ON vehicles FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicles" 
  ON vehicles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicles" 
  ON vehicles FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Fuel logs table policies
CREATE POLICY "Users can view own fuel logs" 
  ON fuel_logs FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fuel logs" 
  ON fuel_logs FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fuel logs" 
  ON fuel_logs FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fuel logs" 
  ON fuel_logs FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Service definitions table policies
CREATE POLICY "Users can view own service defs" 
  ON service_definitions FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own service defs" 
  ON service_definitions FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own service defs" 
  ON service_definitions FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own service defs" 
  ON service_definitions FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Service logs table policies
CREATE POLICY "Users can view own service logs" 
  ON service_logs FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own service logs" 
  ON service_logs FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own service logs" 
  ON service_logs FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own service logs" 
  ON service_logs FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);