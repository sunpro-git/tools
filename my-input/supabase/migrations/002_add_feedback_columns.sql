-- ユーザーフィードバック用カラムを追加
ALTER TABLE public.contents
  ADD COLUMN rating SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN is_adopted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN is_mou_bimyou BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN is_mou_furui BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN is_stocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN comment TEXT;

-- フィルタリング用インデックス
CREATE INDEX IF NOT EXISTS idx_contents_is_favorite ON public.contents (is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_contents_is_mou_bimyou ON public.contents (is_mou_bimyou) WHERE is_mou_bimyou = TRUE;
CREATE INDEX IF NOT EXISTS idx_contents_is_adopted ON public.contents (is_adopted) WHERE is_adopted = TRUE;
CREATE INDEX IF NOT EXISTS idx_contents_is_stocked ON public.contents (is_stocked) WHERE is_stocked = TRUE;
CREATE INDEX IF NOT EXISTS idx_contents_is_mou_furui ON public.contents (is_mou_furui) WHERE is_mou_furui = TRUE;
CREATE INDEX IF NOT EXISTS idx_contents_rating ON public.contents (rating) WHERE rating IS NOT NULL;
