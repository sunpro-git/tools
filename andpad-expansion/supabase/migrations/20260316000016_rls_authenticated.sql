-- authenticated ユーザーにも全操作を許可
CREATE POLICY "Allow all for authenticated" ON csv_imports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON properties FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON deals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
