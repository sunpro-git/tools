-- Dry-run: 各 event row の computeEventType による期待値と現在値を比較
WITH computed AS (
  SELECT
    id,
    event_type AS current_value,
    CASE
      -- お披露目会・見学会名称マッチ
      WHEN COALESCE("eventName", '') || ' ' || COALESCE(name, '') ~ 'お披露目会|見学会'
        THEN CASE WHEN "furnitureSetup" = 'あり' THEN 'ohirome' ELSE 'ohirome_nashi' END
      -- イベント日が登録されている
      WHEN jsonb_array_length(COALESCE("eventDates", '[]'::jsonb)) > 0
        OR jsonb_array_length(COALESCE("openHouseDates", '[]'::jsonb)) > 0
        OR (dates IS NOT NULL AND array_length(dates, 1) > 0)
        OR ("openHouseDate" IS NOT NULL AND "openHouseDate" != '')
        THEN 'event'
      -- 撮影日のみ
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
      ELSE event_type
    END AS new_value
  FROM events
)
SELECT
  current_value,
  new_value,
  COUNT(*) AS cnt,
  CASE WHEN current_value IS DISTINCT FROM new_value THEN 'CHANGE' ELSE 'KEEP' END AS status
FROM computed
GROUP BY current_value, new_value
ORDER BY status, cnt DESC;
