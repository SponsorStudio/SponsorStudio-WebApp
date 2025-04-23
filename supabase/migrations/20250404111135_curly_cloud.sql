/*
  # Add Advertising Categories and Fields
  
  1. New Categories
    - Add various advertising types like billboards, transit ads, mall ads, etc.
  
  2. New Fields
    - Add specific fields for different types of advertising
    - Include metrics like foot traffic and peak hours
*/

-- Add new advertising categories
INSERT INTO categories (name, description)
SELECT * FROM (VALUES
  ('Digital Billboards', 'LED and digital billboard advertising opportunities'),
  ('Static Billboards', 'Traditional static billboard advertising spaces'),
  ('Transit Advertising', 'Bus, train, and other transit-based advertising'),
  ('Mall Advertising', 'Shopping mall advertising spaces including digital screens'),
  ('Cinema Advertising', 'Theater and cinema advertising opportunities'),
  ('Apartment Advertising', 'Residential complex advertising including lifts and common areas'),
  ('Restaurant Advertising', 'Restaurant and cafe advertising spaces'),
  ('Airport Advertising', 'Airport terminal and lounge advertising'),
  ('Retail Store Advertising', 'In-store advertising and POS displays'),
  ('Office Building Advertising', 'Corporate office building advertising spaces'),
  ('Bus Stop Advertising', 'Bus shelter and bus stop advertising'),
  ('Metro Station Advertising', 'Metro and subway station advertising'),
  ('Gym Advertising', 'Fitness center and gym advertising'),
  ('Hospital Advertising', 'Healthcare facility advertising'),
  ('Educational Institution Advertising', 'School and college advertising'),
  ('Influencer Marketing', 'Social media influencer collaborations'),
  ('Digital Display Networks', 'Connected digital display advertising networks')
) AS new_categories(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.name = new_categories.name
);

-- Add new fields to opportunities table to better handle different ad types
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ad_type text;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ad_duration text;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ad_dimensions text;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS foot_traffic numeric;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS peak_hours jsonb;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS target_demographics jsonb;