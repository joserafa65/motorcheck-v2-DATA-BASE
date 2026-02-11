/*
  # User Access and Trial System

  ## Overview
  This migration creates the infrastructure for managing user trial periods using server-side validation.
  Trial expiration is calculated using PostgreSQL's now() function to prevent client-side clock manipulation.

  ## New Tables
  - `user_access`
    - `user_id` (uuid, primary key) - References auth.users
    - `trial_start` (timestamptz, not null) - When the trial period started
    - `trial_end` (timestamptz, not null) - When the trial period expires (server time)
    - `created_at` (timestamptz, default now())
    - `updated_at` (timestamptz, default now())

  ## Functions
  1. `create_trial(p_user_id uuid)`
     - Creates a new 15-day trial for a user
     - Prevents duplicate trials
     - Sets trial_start to now() and trial_end to now() + 15 days
     - Returns the created record
  
  2. `is_trial_active(p_user_id uuid)`
     - Checks if a user's trial is still active
     - Compares trial_end with server time (now())
     - Returns true if trial is active, false if expired or doesn't exist

  ## Security
  - Enable RLS on user_access table
  - Policy: Users can only read their own access record
  - Trigger: Automatically update updated_at timestamp

  ## Important Notes
  - All date comparisons use PostgreSQL's now() function (server time)
  - Trial duration is set to 15 days
  - One trial per user (enforced by primary key)
*/

-- Create user_access table
CREATE TABLE IF NOT EXISTS user_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_start timestamptz NOT NULL,
  trial_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_access ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own access record
CREATE POLICY "Users can view own access record"
  ON user_access
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row changes
CREATE TRIGGER user_access_updated_at
  BEFORE UPDATE ON user_access
  FOR EACH ROW
  EXECUTE FUNCTION update_user_access_updated_at();

-- Function to create a new trial for a user
CREATE OR REPLACE FUNCTION create_trial(p_user_id uuid)
RETURNS user_access AS $$
DECLARE
  v_result user_access;
BEGIN
  -- Check if trial already exists for this user
  IF EXISTS (SELECT 1 FROM user_access WHERE user_id = p_user_id) THEN
    -- Return existing record without creating a duplicate
    SELECT * INTO v_result FROM user_access WHERE user_id = p_user_id;
    RETURN v_result;
  END IF;

  -- Insert new trial record with 15-day duration
  INSERT INTO user_access (
    user_id,
    trial_start,
    trial_end
  ) VALUES (
    p_user_id,
    now(),
    now() + interval '15 days'
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user's trial is currently active
CREATE OR REPLACE FUNCTION is_trial_active(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_trial_end timestamptz;
BEGIN
  -- Get the trial end date for the user
  SELECT trial_end INTO v_trial_end
  FROM user_access
  WHERE user_id = p_user_id;

  -- If no record exists, trial is not active
  IF v_trial_end IS NULL THEN
    RETURN false;
  END IF;

  -- Compare trial_end with current server time
  -- Returns true if trial hasn't expired yet
  RETURN now() < v_trial_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
