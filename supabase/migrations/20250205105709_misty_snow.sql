/*
  # Opportunity Platform Schema

  1. New Tables
    - `profiles`
      - Extended user profile information
      - Links to Supabase auth.users
      - Stores user type and profile details
    
    - `opportunities`
      - Marketing opportunities listed by creators/events
      - Includes details like type, location, reach, etc.
    
    - `matches`
      - Stores brand responses to opportunities
      - Tracks match status and communication
    
    - `categories`
      - Opportunity categories (e.g., Events, Influencer Marketing)
    
  2. Security
    - RLS policies for each table
    - Role-based access control
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('brand', 'agency', 'creator', 'event_organizer')),
  company_name text,
  website text,
  industry text,
  annual_marketing_budget numeric,
  target_audience jsonb,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Create opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id),
  title text NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  reach numeric,
  footfall numeric,
  start_date date,
  end_date date,
  price_range jsonb,
  requirements text,
  benefits text,
  media_urls text[],
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage their opportunities"
  ON opportunities
  FOR ALL
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Brands can view active opportunities"
  ON opportunities
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES profiles(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  meeting_scheduled_at timestamptz,
  meeting_link text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands can view their matches"
  ON matches
  FOR SELECT
  TO authenticated
  USING (brand_id = auth.uid());

CREATE POLICY "Brands can create matches"
  ON matches
  FOR INSERT
  TO authenticated
  WITH CHECK (brand_id = auth.uid());

CREATE POLICY "Opportunity creators can view matches for their opportunities"
  ON matches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM opportunities
      WHERE opportunities.id = matches.opportunity_id
      AND opportunities.creator_id = auth.uid()
    )
  );

-- Insert default categories
INSERT INTO categories (name, description) VALUES
  ('Events', 'Physical events, conferences, and gatherings'),
  ('Influencer Marketing', 'Social media influencer collaborations'),
  ('Content Creation', 'Custom content and branded content opportunities'),
  ('Venue Advertising', 'Physical advertising spaces and venue partnerships'),
  ('Digital Marketing', 'Online marketing and digital advertising opportunities'),
  ('Sponsorships', 'Event and program sponsorships');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();