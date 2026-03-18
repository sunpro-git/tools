-- Convert text date columns to proper DATE type
-- Data has been pre-cleaned to YYYY-MM-DD format

ALTER TABLE deals
  ALTER COLUMN order_date_planned TYPE date USING NULLIF(order_date_planned, '')::date,
  ALTER COLUMN handover_date_actual TYPE date USING NULLIF(handover_date_actual, '')::date,
  ALTER COLUMN handover_date_planned TYPE date USING NULLIF(handover_date_planned, '')::date;

NOTIFY pgrst, 'reload schema';
