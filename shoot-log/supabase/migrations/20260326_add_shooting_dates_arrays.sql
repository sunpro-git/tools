-- 撮影種別ごとの複数日程対応カラム追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS "youtubeDates" JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "photoDates" JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "exteriorPhotoDates" JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaLiveDates" JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaRegularDates" JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaPromoDates" JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "otherDates" JSONB DEFAULT '[]';

-- 既存データの移行（単一日付→配列の最初の要素）
UPDATE events SET "youtubeDates" = jsonb_build_array("youtubeDate") WHERE "youtubeDate" IS NOT NULL AND "youtubeDate" != '' AND ("youtubeDates" IS NULL OR "youtubeDates" = '[]'::jsonb);
UPDATE events SET "photoDates" = jsonb_build_array("photoDate") WHERE "photoDate" IS NOT NULL AND "photoDate" != '' AND ("photoDates" IS NULL OR "photoDates" = '[]'::jsonb);
UPDATE events SET "exteriorPhotoDates" = jsonb_build_array("exteriorPhotoDate") WHERE "exteriorPhotoDate" IS NOT NULL AND "exteriorPhotoDate" != '' AND ("exteriorPhotoDates" IS NULL OR "exteriorPhotoDates" = '[]'::jsonb);
UPDATE events SET "instaLiveDates" = jsonb_build_array("instaLiveDate") WHERE "instaLiveDate" IS NOT NULL AND "instaLiveDate" != '' AND ("instaLiveDates" IS NULL OR "instaLiveDates" = '[]'::jsonb);
UPDATE events SET "instaRegularDates" = jsonb_build_array("instaRegularDate") WHERE "instaRegularDate" IS NOT NULL AND "instaRegularDate" != '' AND ("instaRegularDates" IS NULL OR "instaRegularDates" = '[]'::jsonb);
UPDATE events SET "instaPromoDates" = jsonb_build_array("instaPromoDate") WHERE "instaPromoDate" IS NOT NULL AND "instaPromoDate" != '' AND ("instaPromoDates" IS NULL OR "instaPromoDates" = '[]'::jsonb);
UPDATE events SET "otherDates" = jsonb_build_array("otherDate") WHERE "otherDate" IS NOT NULL AND "otherDate" != '' AND ("otherDates" IS NULL OR "otherDates" = '[]'::jsonb);
