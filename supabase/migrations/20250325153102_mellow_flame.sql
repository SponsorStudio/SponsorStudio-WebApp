-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public) 
VALUES ('public', 'public', true);

-- Add profile_picture_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_url text;

-- Add storage policy to allow authenticated users to upload profile pictures
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public');

CREATE POLICY "Allow authenticated users to update their files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'public' AND owner = auth.uid())
WITH CHECK (bucket_id = 'public' AND owner = auth.uid());

CREATE POLICY "Allow authenticated users to delete their files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'public' AND owner = auth.uid());

CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'public');