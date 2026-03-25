-- eventsテーブルに撮影関連カラムを追加（shoot_logsとの統合）
ALTER TABLE events ADD COLUMN IF NOT EXISTS "furnitureSetup" TEXT DEFAULT 'なし';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "customerLat" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "customerLon" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "mainStore" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "shootingRangeFrom" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "shootingRangeTo" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "openHouseDate" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "openHouseDates" JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "handoverSource" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "propertyId" TEXT DEFAULT '';

-- YouTube撮影
ALTER TABLE events ADD COLUMN IF NOT EXISTS "youtubeDate" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "youtubeStartTime" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "youtubeEndTime" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "youtubeStaff" JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "youtubeRequested" BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS "youtubeNote" TEXT DEFAULT '';

-- スチール撮影
ALTER TABLE events ADD COLUMN IF NOT EXISTS "photoDate" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "photoStartTime" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "photoEndTime" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "photoStaff" JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "photoRequested" BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS "photoNote" TEXT DEFAULT '';

-- 外観スチール撮影
ALTER TABLE events ADD COLUMN IF NOT EXISTS "exteriorPhotoDate" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "exteriorPhotoStartTime" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "exteriorPhotoEndTime" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "exteriorPhotoStaff" JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "exteriorPhotoRequested" BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS "exteriorPhotoNote" TEXT DEFAULT '';

-- インスタライブ撮影
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaLiveDate" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaLiveStartTime" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaLiveEndTime" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaLiveStaff" JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaLiveRequested" BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaLiveNote" TEXT DEFAULT '';

-- インスタ通常投稿撮影
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaRegularDate" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaRegularStartTime" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaRegularEndTime" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaRegularStaff" JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaRegularRequested" BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaRegularNote" TEXT DEFAULT '';

-- インスタ宣伝撮影
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaPromoDate" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaPromoStartTime" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaPromoEndTime" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaPromoStaff" JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaPromoRequested" BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instaPromoNote" TEXT DEFAULT '';

-- その他撮影
ALTER TABLE events ADD COLUMN IF NOT EXISTS "otherDate" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "otherStartTime" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "otherEndTime" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "otherStaff" JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "otherRequested" BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS "otherNote" TEXT DEFAULT '';

-- 撮影依頼情報
ALTER TABLE events ADD COLUMN IF NOT EXISTS requester TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "shootingTypes" JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "parkingInfo" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "shootingPoints" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "witnessStaff" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "ownerPresence" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instructionFileUrl" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "instructionFileName" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "overviewFileUrl" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "overviewFileName" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "shootingNotes" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "contractDate" TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS "contractAmount" TEXT DEFAULT '';

-- systemIdユニークインデックス
CREATE UNIQUE INDEX IF NOT EXISTS events_systemid_unique ON events ("systemId") WHERE "systemId" != '';

-- shoot_logsからデータ移行（systemIdの重複を避けてINSERT）
INSERT INTO events (
  name, address, category, "furnitureSetup", "customerName", "customerLat", "customerLon",
  "mainStore", "googleMapUrl", "eventName", "setupDate", "setupEndTime", "setupVehicle", "setupVehicle2",
  "teardownDate", "teardownEndTime", "teardownVehicle", "teardownVehicle2",
  "shootingRangeFrom", "shootingRangeTo", "openHouseDate", "openHouseDates",
  "handoverDate", "handoverSource",
  "youtubeDate", "youtubeStartTime", "youtubeEndTime", "youtubeStaff", "youtubeRequested", "youtubeNote",
  "photoDate", "photoStartTime", "photoEndTime", "photoStaff", "photoRequested", "photoNote",
  "exteriorPhotoDate", "exteriorPhotoStartTime", "exteriorPhotoEndTime", "exteriorPhotoStaff", "exteriorPhotoRequested", "exteriorPhotoNote",
  "instaLiveDate", "instaLiveStartTime", "instaLiveEndTime", "instaLiveStaff", "instaLiveRequested", "instaLiveNote",
  "instaRegularDate", "instaRegularStartTime", "instaRegularEndTime", "instaRegularStaff", "instaRegularRequested", "instaRegularNote",
  "instaPromoDate", "instaPromoStartTime", "instaPromoEndTime", "instaPromoStaff", "instaPromoRequested", "instaPromoNote",
  "otherDate", "otherStartTime", "otherEndTime", "otherStaff", "otherRequested", "otherNote",
  "notificationStaff", "systemId", "salesRep", "icRep", "constructionRep",
  requester, "shootingTypes", "parkingInfo", "shootingPoints", "witnessStaff", "ownerPresence",
  "instructionFileUrl", "instructionFileName", "overviewFileUrl", "overviewFileName",
  "shootingNotes", "contractDate", "contractAmount",
  "createdAt", "updatedAt"
)
SELECT
  name, address, category, "furnitureSetup", "customerName", "customerLat", "customerLon",
  "mainStore", "googleMapUrl", "eventName", "setupDate", "setupEndTime", "setupVehicle", "setupVehicle2",
  "teardownDate", "teardownEndTime", "teardownVehicle", "teardownVehicle2",
  "shootingRangeFrom", "shootingRangeTo", "openHouseDate", "openHouseDates",
  "handoverDate", "handoverSource",
  "youtubeDate", "youtubeStartTime", "youtubeEndTime", "youtubeStaff", "youtubeRequested", "youtubeNote",
  "photoDate", "photoStartTime", "photoEndTime", "photoStaff", "photoRequested", "photoNote",
  "exteriorPhotoDate", "exteriorPhotoStartTime", "exteriorPhotoEndTime", "exteriorPhotoStaff", "exteriorPhotoRequested", "exteriorPhotoNote",
  "instaLiveDate", "instaLiveStartTime", "instaLiveEndTime", "instaLiveStaff", "instaLiveRequested", "instaLiveNote",
  "instaRegularDate", "instaRegularStartTime", "instaRegularEndTime", "instaRegularStaff", "instaRegularRequested", "instaRegularNote",
  "instaPromoDate", "instaPromoStartTime", "instaPromoEndTime", "instaPromoStaff", "instaPromoRequested", "instaPromoNote",
  "otherDate", "otherStartTime", "otherEndTime", "otherStaff", "otherRequested", "otherNote",
  "notificationStaff", "systemId", "salesRep", "icRep", "constructionRep",
  requester, "shootingTypes", "parkingInfo", "shootingPoints", "witnessStaff", "ownerPresence",
  "instructionFileUrl", "instructionFileName", "overviewFileUrl", "overviewFileName",
  "shootingNotes", "contractDate", "contractAmount",
  "createdAt", "updatedAt"
FROM shoot_logs
WHERE "systemId" = '' OR "systemId" NOT IN (SELECT "systemId" FROM events WHERE "systemId" != '');
