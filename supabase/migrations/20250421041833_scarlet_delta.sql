/*
  # Add Phone Number to Profiles
  
  1. Changes
    - Add phone_number column to profiles table
    - Add phone_number_verified column to profiles table
*/

-- Add phone number fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS phone_number_verified boolean DEFAULT false;

-- Add constraint to ensure phone number is in international format
ALTER TABLE profiles
ADD CONSTRAINT phone_number_format CHECK (
  phone_number IS NULL OR 
  phone_number ~ '^\+[1-9]\d{1,14}$'
);