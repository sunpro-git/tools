-- deals.statusのCHECK制約を削除（ANDPADのステータス値が制約外のため）
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_status_check;

NOTIFY pgrst, 'reload schema';
