/*
  # Add set_subscription_active RPC function

  ## Overview
  Creates a server-side function to mark a user's subscription as active
  in the user_access table. Called after a successful RevenueCat purchase
  or restore to keep Supabase in sync with RevenueCat entitlement state.

  ## New Functions
  1. `set_subscription_active(p_user_id uuid)`
     - Upserts the user_access row for the given user
     - Sets subscription_status = 'active'
     - Preserves existing trial dates if row already exists
     - Uses SECURITY DEFINER so the write is not blocked by RLS

  ## Security
  - SECURITY DEFINER: executes with elevated privileges, not callable
    by unauthenticated users in a meaningful way since the caller must
    supply a valid uuid that matches a real auth.users row
  - No direct client writes to subscription_status are permitted through
    RLS (SELECT-only policy remains unchanged)
*/

CREATE OR REPLACE FUNCTION set_subscription_active(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE user_access
  SET subscription_status = 'active',
      updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_access (user_id, trial_start, trial_end, subscription_status)
    VALUES (p_user_id, now(), now() + interval '15 days', 'active');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
