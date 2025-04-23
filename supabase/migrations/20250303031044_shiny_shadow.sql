-- Update categories with more specific event types
-- First, create new categories
INSERT INTO categories (name, description) VALUES
  ('Fashion Show', 'Fashion events, runway shows, and designer showcases'),
  ('Expo', 'Trade shows, exhibitions, and industry expos'),
  ('Conference', 'Professional conferences, summits, and business events'),
  ('College Fest', 'University and college cultural and technical festivals'),
  ('Tech Fest', 'Technology-focused events, hackathons, and innovation showcases'),
  ('Entrepreneurship Summit', 'Startup events, pitch competitions, and business summits'),
  ('Music Festival', 'Concerts, music festivals, and performance events'),
  ('Sports Event', 'Sporting competitions, tournaments, and athletic events'),
  ('Cultural Festival', 'Cultural celebrations, art exhibitions, and heritage events'),
  ('Workshop', 'Educational workshops, training sessions, and skill development programs');

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