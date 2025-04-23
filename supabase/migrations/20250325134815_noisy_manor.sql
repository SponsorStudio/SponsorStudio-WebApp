/*
  # Create Admin User

  1. Changes
    - Add 'admin' as valid user_type in profiles table
    - Update user_type check constraint
*/

-- Update the user_type check constraint in profiles table
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check 
  CHECK (user_type = ANY (ARRAY['brand'::text, 'agency'::text, 'creator'::text, 'event_organizer'::text, 'admin'::text]));

-- Note: The admin user must be created through the application signup flow
-- This migration only adds support for the admin user type