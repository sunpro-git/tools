-- 部分インデックスを削除（onConflictで使えないため）
DROP INDEX IF EXISTS idx_properties_systemid_unique;

-- 通常のUNIQUE制約に変更（NULLは複数許可される）
ALTER TABLE properties ADD CONSTRAINT properties_systemid_unique UNIQUE ("systemId");
