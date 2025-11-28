-- Add pinned and featured columns to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(is_pinned, created_at DESC) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(is_featured, created_at DESC) WHERE is_featured = TRUE;

