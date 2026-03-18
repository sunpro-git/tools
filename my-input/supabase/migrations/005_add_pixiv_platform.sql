-- Add 'pixiv' to the platform CHECK constraint
ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_platform_check;
ALTER TABLE contents ADD CONSTRAINT contents_platform_check
  CHECK (platform IN ('note', 'x', 'instagram', 'youtube', 'pixiv', 'other'));
