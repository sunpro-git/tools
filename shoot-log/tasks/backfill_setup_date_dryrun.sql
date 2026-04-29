-- Dry-run: sample of events that would have setupDate backfilled
WITH first_event_date AS (
  SELECT
    e.id, e.name, e."setupDate",
    LEAST(
      (SELECT MIN(d::date) FROM jsonb_array_elements_text(COALESCE(e."eventDates", '[]'::jsonb)) AS d WHERE d ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'),
      (SELECT MIN(d) FROM unnest(COALESCE(e.dates, ARRAY[]::date[])) AS d)
    ) AS first_date
  FROM events e
  WHERE (e."setupDate" IS NULL OR e."setupDate" = '')
)
SELECT
  name,
  first_date AS first_event_date,
  TO_CHAR(first_date - INTERVAL '1 day', 'YYYY-MM-DD') AS will_set_setup_date
FROM first_event_date
WHERE first_date IS NOT NULL AND first_date <= '2026-04-30'
ORDER BY first_date DESC
LIMIT 5;
