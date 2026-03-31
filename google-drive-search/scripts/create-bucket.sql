INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_read" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "service_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'thumbnails');
CREATE POLICY "service_update" ON storage.objects FOR UPDATE USING (bucket_id = 'thumbnails');
