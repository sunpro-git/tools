-- 2026年4月以前のイベント日を持ち setupDate が空のイベント行に対して、
-- 「最初のイベント日の前日」を setupDate として設定する。

WITH first_event_date AS (
  SELECT
    e.id,
    LEAST(
      (SELECT MIN(d::date) FROM jsonb_array_elements_text(COALESCE(e."eventDates", '[]'::jsonb)) AS d WHERE d ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'),
      (SELECT MIN(d) FROM unnest(COALESCE(e.dates, ARRAY[]::date[])) AS d)
    ) AS first_date
  FROM events e
  WHERE (e."setupDate" IS NULL OR e."setupDate" = '')
)
UPDATE events e
SET "setupDate" = TO_CHAR(fed.first_date - INTERVAL '1 day', 'YYYY-MM-DD'),
    "updatedAt" = NOW()
FROM first_event_date fed
WHERE e.id = fed.id
  AND fed.first_date IS NOT NULL
  AND fed.first_date <= '2026-04-30';
