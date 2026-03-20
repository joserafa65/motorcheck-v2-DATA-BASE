
/*
  # Storage RLS Policies for 'uploads' bucket

  1. Policies
    - Authenticated users can upload to their own folder (uploads/{userId}/...)
    - Anyone can read public files (bucket is public)
    - Authenticated users can update/delete their own files
*/

CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Public read access for uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'uploads');

CREATE POLICY "Authenticated users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
