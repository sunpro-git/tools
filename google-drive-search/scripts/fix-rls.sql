DROP POLICY IF EXISTS "service_role_full_access" ON image_index;
DROP POLICY IF EXISTS "service_role_full_access" ON drive_sources;
DROP POLICY IF EXISTS "service_role_full_access" ON index_status;

CREATE POLICY "allow_read" ON image_index FOR SELECT USING (true);
CREATE POLICY "allow_all_service" ON image_index FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_read" ON drive_sources FOR SELECT USING (true);
CREATE POLICY "allow_all_service" ON drive_sources FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_read" ON index_status FOR SELECT USING (true);
CREATE POLICY "allow_all_service" ON index_status FOR ALL USING (true) WITH CHECK (true);
