-- 開始日をNULL許可にする（空欄＝過去すべての期間に所属）
ALTER TABLE staff_departments ALTER COLUMN start_date DROP NOT NULL;
