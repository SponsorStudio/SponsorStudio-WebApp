/*
  # Add Profile Picture Support

  1. Changes
    - Add profile_picture_url column to profiles table
    - Add storage policies for file management
    - Add error handling for policy creation
*/

-- Add profile_picture_url column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_picture_url text;
  END IF;
END $$;

-- Create storage policies with error handling
DO $$
BEGIN
  -- Upload policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow authenticated users to upload files'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'public');
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow authenticated users to update their files'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow authenticated users to update their files"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'public' AND owner = auth.uid())
    WITH CHECK (bucket_id = 'public' AND owner = auth.uid());
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow authenticated users to delete their files'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete their files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'public' AND owner = auth.uid());
  END IF;

  -- Read policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow public read access'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow public read access"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'public');
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Log error details
  RAISE NOTICE 'Error creating storage policies: %', SQLERRM;
END $$;