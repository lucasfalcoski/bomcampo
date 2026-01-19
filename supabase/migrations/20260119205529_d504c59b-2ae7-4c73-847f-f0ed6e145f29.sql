-- Create uploads storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Enable RLS on storage.objects if not already enabled
-- (This is typically already enabled by default)

-- Policy: Users can upload to their own folder (ai-photos/{user_id}/*)
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'ai-photos' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Users can read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'ai-photos' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'ai-photos' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: System staff can access all files for support purposes
CREATE POLICY "System staff can access all files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND
  public.is_system_staff(auth.uid())
);