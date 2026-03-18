DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='dates') THEN
    ALTER TABLE events ADD COLUMN dates date[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='note') THEN
    ALTER TABLE events ADD COLUMN note text;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
