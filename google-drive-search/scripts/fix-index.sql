DROP INDEX IF EXISTS idx_image_embedding;
CREATE INDEX idx_image_embedding ON image_index USING hnsw (embedding vector_cosine_ops);
