/*
  # Initial Schema Setup

  1. New Tables
    - `client_logos`
      - `id` (uuid, primary key)
      - `name` (text)
      - `logo_url` (text)
      - `created_at` (timestamp)
    
    - `success_stories`
      - `id` (uuid, primary key)
      - `title` (text)
      - `preview_image` (text)
      - `preview_text` (text)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `story_media`
      - `id` (uuid, primary key)
      - `story_id` (uuid, foreign key)
      - `media_type` (text) - 'image' or 'video'
      - `url` (text)
      - `caption` (text)
      - `created_at` (timestamp)

    - `contact_submissions`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text)
      - `message` (text)
      - `organization_type` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage content
    - Allow public read access to client_logos and success_stories
*/

-- Create client_logos table
CREATE TABLE client_logos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE client_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to client_logos"
  ON client_logos
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to manage client_logos"
  ON client_logos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create success_stories table
CREATE TABLE success_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  preview_image text NOT NULL,
  preview_text text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE success_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to success_stories"
  ON success_stories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to manage success_stories"
  ON success_stories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create story_media table
CREATE TABLE story_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES success_stories(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE story_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to story_media"
  ON story_media
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to manage story_media"
  ON story_media
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create contact_submissions table
CREATE TABLE contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  organization_type text NOT NULL CHECK (organization_type IN ('brand', 'marketing_agency', 'influencer_agency', 'influencer')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public to create contact submissions"
  ON contact_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (true);