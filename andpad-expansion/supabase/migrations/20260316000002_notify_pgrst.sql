-- PostgRESTのスキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';
