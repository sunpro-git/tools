-- 既存イベント行の name フィールドを eventName にコピー
-- 旧データ（インポートされた完成お披露目会・見学会・住宅博など）は
-- 案件名フィールド (name) に「2026-05-23_R_唐澤ひろみ邸お披露目会_駒ケ根」のような
-- イベント名相当のテキストが入っていたため、eventName 側にもコピーする。
-- name はそのまま保持（form 側で必須項目のため）。

UPDATE events
SET "eventName" = name,
    "updatedAt" = NOW()
WHERE ("eventName" = '' OR "eventName" IS NULL)
  AND name != ''
  AND name != '案件なし';
