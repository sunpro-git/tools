-- イベント・撮影情報を顧客に紐づけるための customerAndpadId カラム追加
-- 既存の propertyId から deals.customer_andpad_id を引いてバックフィル

ALTER TABLE events ADD COLUMN IF NOT EXISTS "customerAndpadId" TEXT DEFAULT '';

-- 既存の propertyId が deals.id を参照しているので、そこから customer_andpad_id を引く
UPDATE events e
SET "customerAndpadId" = COALESCE(d.customer_andpad_id::text, '')
FROM deals d
WHERE e."propertyId" IS NOT NULL
  AND e."propertyId" != ''
  AND e."propertyId" = d.id::text
  AND (e."customerAndpadId" IS NULL OR e."customerAndpadId" = '');

CREATE INDEX IF NOT EXISTS events_customer_andpad_id_idx ON events ("customerAndpadId") WHERE "customerAndpadId" != '';
