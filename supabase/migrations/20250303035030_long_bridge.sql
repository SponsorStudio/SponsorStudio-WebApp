/*
  # Update profiles and opportunities tables
  
  1. Changes
     - Add conditional category insertions to avoid duplicates
     - Add detailed profile fields for better user information
     - Add verification fields to opportunities table
*/

-- Update categories with more specific event types - only if they don't exist
DO $$
BEGIN
  -- Fashion Show
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Fashion Show') THEN
    INSERT INTO categories (name, description) VALUES
      ('Fashion Show', 'Fashion events, runway shows, and designer showcases');
  END IF;
  
  -- Expo
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Expo') THEN
    INSERT INTO categories (name, description) VALUES
      ('Expo', 'Trade shows, exhibitions, and industry expos');
  END IF;
  
  -- Conference
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Conference') THEN
    INSERT INTO categories (name, description) VALUES
      ('Conference', 'Professional conferences, summits, and business events');
  END IF;
  
  -- College Fest
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'College Fest') THEN
    INSERT INTO categories (name, description) VALUES
      ('College Fest', 'University and college cultural and technical festivals');
  END IF;
  
  -- Tech Fest
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Tech Fest') THEN
    INSERT INTO categories (name, description) VALUES
      ('Tech Fest', 'Technology-focused events, hackathons, and innovation showcases');
  END IF;
  
  -- Entrepreneurship Summit
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Entrepreneurship Summit') THEN
    INSERT INTO categories (name, description) VALUES
      ('Entrepreneurship Summit', 'Startup events, pitch competitions, and business summits');
  END IF;
  
  -- Music Festival
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Music Festival') THEN
    INSERT INTO categories (name, description) VALUES
      ('Music Festival', 'Concerts, music festivals, and performance events');
  END IF;
  
  -- Sports Event
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Sports Event') THEN
    INSERT INTO categories (name, description) VALUES
      ('Sports Event', 'Sporting competitions, tournaments, and athletic events');
  END IF;
  
  -- Cultural Festival
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Cultural Festival') THEN
    INSERT INTO categories (name, description) VALUES
      ('Cultural Festival', 'Cultural celebrations, art exhibitions, and heritage events');
  END IF;
  
  -- Workshop
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Workshop') THEN
    INSERT INTO categories (name, description) VALUES
      ('Workshop', 'Educational workshops, training sessions, and skill development programs');
  END IF;
END $$;

-- Add more detailed fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry_details text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_channels text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS previous_sponsorships jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sponsorship_goals text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_person_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_person_position text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_person_phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_media jsonb;

-- Add audience demographics fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'target_audience'
  ) THEN
    ALTER TABLE profiles ADD COLUMN target_audience jsonb;
  END IF;
END $$;

-- Add calendly_link field to opportunities table
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS calendly_link text;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS sponsorship_brochure_url text;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS rejection_reason text;