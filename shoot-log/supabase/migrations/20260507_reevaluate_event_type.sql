-- 既存全件の event_type を computeEventType ロジックで再判定して一括更新
-- ロジック:
--   1. 名称(eventName + name)に「お披露目会」「見学会」を含む
--      → 家具設営=あり: ohirome / なし: ohirome_nashi
--   2. イベント日 (eventDates / openHouseDates / dates / openHouseDate) あり
--      → event
--   3. 撮影日 (youtubeDates 等) あり
--      → 家具設営=あり: satsuei / なし: satsuei_nashi
--   4. それ以外: event (saveEvent のデフォルトに合わせる)

UPDATE events
SET event_type = CASE
  WHEN COALESCE("eventName", '') || ' ' || COALESCE(name, '') ~ 'お披露目会|見学会'
    THEN CASE WHEN "furnitureSetup" = 'あり' THEN 'ohirome' ELSE 'ohirome_nashi' END
  WHEN jsonb_array_length(COALESCE("eventDates", '[]'::jsonb)) > 0
    OR jsonb_array_length(COALESCE("openHouseDates", '[]'::jsonb)) > 0
    OR (dates IS NOT NULL AND array_length(dates, 1) > 0)
    OR ("openHouseDate" IS NOT NULL AND "openHouseDate" != '')
    THEN 'event'
  WHEN jsonb_array_length(COALESCE("youtubeDates", '[]'::jsonb)) > 0
    OR jsonb_array_length(COALESCE("photoDates", '[]'::jsonb)) > 0
    OR jsonb_array_length(COALESCE("exteriorPhotoDates", '[]'::jsonb)) > 0
    OR jsonb_array_length(COALESCE("instaLiveDates", '[]'::jsonb)) > 0
    OR jsonb_array_length(COALESCE("instaRegularDates", '[]'::jsonb)) > 0
    OR jsonb_array_length(COALESCE("instaPromoDates", '[]'::jsonb)) > 0
    OR jsonb_array_length(COALESCE("otherDates", '[]'::jsonb)) > 0
    OR ("youtubeDate" IS NOT NULL AND "youtubeDate" != '')
    OR ("photoDate" IS NOT NULL AND "photoDate" != '')
    OR ("exteriorPhotoDate" IS NOT NULL AND "exteriorPhotoDate" != '')
    OR ("instaLiveDate" IS NOT NULL AND "instaLiveDate" != '')
    OR ("instaRegularDate" IS NOT NULL AND "instaRegularDate" != '')
    OR ("instaPromoDate" IS NOT NULL AND "instaPromoDate" != '')
    OR ("otherDate" IS NOT NULL AND "otherDate" != '')
    THEN CASE WHEN "furnitureSetup" = 'あり' THEN 'satsuei' ELSE 'satsuei_nashi' END
  ELSE 'event'
END,
"updatedAt" = NOW();
