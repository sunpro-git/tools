CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT '新築',
  "setupDate" TEXT DEFAULT '',
  "setupEndTime" TEXT DEFAULT '',
  "setupVehicle" TEXT DEFAULT '',
  "setupVehicle2" TEXT DEFAULT '',
  "teardownDate" TEXT DEFAULT '',
  "teardownEndTime" TEXT DEFAULT '',
  "teardownVehicle" TEXT DEFAULT '',
  "teardownVehicle2" TEXT DEFAULT '',
  "eventDates" JSONB DEFAULT '[]',
  "notificationStaff" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to events" ON events FOR ALL USING (true) WITH CHECK (true);
ALTER publication supabase_realtime ADD TABLE events;
