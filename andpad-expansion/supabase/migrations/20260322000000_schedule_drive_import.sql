-- Google Driveからの自動インポートを20分間隔でスケジュール
-- 前提: pg_cron, pg_net 拡張がSupabaseダッシュボードで有効化済みであること

-- pg_net: Edge FunctionをHTTP呼び出しするために必要
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 20分間隔でEdge Functionを呼び出す
SELECT cron.schedule(
  'import-from-drive',
  '*/20 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/import-from-drive',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
