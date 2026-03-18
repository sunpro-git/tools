-- RLSを無効化（シンプルなダッシュボードアプリのため認証なし）
ALTER TABLE csv_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- anon ユーザーに全操作を許可
CREATE POLICY "Allow all for anon" ON csv_imports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON contracts FOR ALL USING (true) WITH CHECK (true);
