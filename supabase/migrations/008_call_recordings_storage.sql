-- Create storage bucket for call recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-recordings', 'call-recordings', false)
ON CONFLICT (id) DO UPDATE SET name = 'call-recordings', public = false;

-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload call recordings
CREATE POLICY "Authenticated users can upload call recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'call-recordings');

-- Policy: Allow authenticated users to read call recordings
CREATE POLICY "Authenticated users can read call recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'call-recordings');

-- Policy: Allow users to delete their own call recordings
CREATE POLICY "Users can delete their own call recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'call-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add call_recording_url column to appointments table
ALTER TABLE ss_appointments
ADD COLUMN call_recording_url TEXT;

-- Add comment
COMMENT ON COLUMN ss_appointments.call_recording_url IS 'URL to call recording file in Supabase Storage';
