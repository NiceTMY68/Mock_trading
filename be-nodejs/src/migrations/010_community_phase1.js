/**
 * Migration: Community Phase 1
 * 
 * Tables:
 * - bookmarks: Lưu bài viết
 * - user_blocks: Block users
 * - post_views: View count
 * - hashtags: Hashtag management
 * - post_hashtags: Many-to-many posts <-> hashtags
 * 
 * Updates:
 * - posts: add view_count, trending_score
 */

export const up = async (db) => {
  // 1. Bookmarks table
  await db.query(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      collection VARCHAR(100) DEFAULT 'default',
      -- Collection/folder name for organizing bookmarks
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, post_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_post ON bookmarks(post_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_collection ON bookmarks(user_id, collection);
  `);
  console.log('✅ Created bookmarks table');

  // 2. User blocks table
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      id SERIAL PRIMARY KEY,
      blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(blocker_id, blocked_id),
      CHECK (blocker_id != blocked_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
    CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
  `);
  console.log('✅ Created user_blocks table');

  // 3. Post views table (for detailed analytics)
  await db.query(`
    CREATE TABLE IF NOT EXISTS post_views (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      -- NULL for anonymous views
      ip_hash VARCHAR(64),
      -- Hashed IP for anonymous view tracking
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_post_views_post ON post_views(post_id);
    CREATE INDEX IF NOT EXISTS idx_post_views_user ON post_views(user_id);
    CREATE INDEX IF NOT EXISTS idx_post_views_created ON post_views(created_at);
  `);
  console.log('✅ Created post_views table');

  // 4. Hashtags table
  await db.query(`
    CREATE TABLE IF NOT EXISTS hashtags (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      -- Hashtag without # symbol, lowercase
      post_count INTEGER DEFAULT 0,
      -- Denormalized count for performance
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_hashtags_name ON hashtags(name);
    CREATE INDEX IF NOT EXISTS idx_hashtags_count ON hashtags(post_count DESC);
  `);
  console.log('✅ Created hashtags table');

  // 5. Post-Hashtags junction table
  await db.query(`
    CREATE TABLE IF NOT EXISTS post_hashtags (
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      hashtag_id INTEGER NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, hashtag_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_post_hashtags_post ON post_hashtags(post_id);
    CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag ON post_hashtags(hashtag_id);
  `);
  console.log('✅ Created post_hashtags table');

  // 6. Update posts table - add view_count and trending_score
  await db.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'view_count'
      ) THEN
        ALTER TABLE posts ADD COLUMN view_count INTEGER DEFAULT 0;
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'trending_score'
      ) THEN
        ALTER TABLE posts ADD COLUMN trending_score DECIMAL(10,2) DEFAULT 0;
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'bookmark_count'
      ) THEN
        ALTER TABLE posts ADD COLUMN bookmark_count INTEGER DEFAULT 0;
      END IF;
    END $$;
    
    CREATE INDEX IF NOT EXISTS idx_posts_view_count ON posts(view_count DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_trending ON posts(trending_score DESC);
  `);
  console.log('✅ Updated posts table with view_count, trending_score, bookmark_count');

  // 7. Create function to update trending score
  await db.query(`
    CREATE OR REPLACE FUNCTION calculate_trending_score(
      p_view_count INTEGER,
      p_reactions_count INTEGER,
      p_comments_count INTEGER,
      p_bookmark_count INTEGER,
      p_created_at TIMESTAMP WITH TIME ZONE
    ) RETURNS DECIMAL AS $$
    DECLARE
      age_hours DECIMAL;
      gravity DECIMAL := 1.8;
      base_score DECIMAL;
    BEGIN
      -- Calculate age in hours
      age_hours := EXTRACT(EPOCH FROM (NOW() - p_created_at)) / 3600.0;
      
      -- Base score: weighted sum of interactions
      -- Views: 1pt, Reactions: 3pt, Comments: 5pt, Bookmarks: 4pt
      base_score := COALESCE(p_view_count, 0) * 1 
                  + COALESCE(p_reactions_count, 0) * 3 
                  + COALESCE(p_comments_count, 0) * 5 
                  + COALESCE(p_bookmark_count, 0) * 4;
      
      -- Apply time decay (Hacker News algorithm variant)
      -- Score decreases as post ages
      RETURN base_score / POWER(age_hours + 2, gravity);
    END;
    $$ LANGUAGE plpgsql;
  `);
  console.log('✅ Created calculate_trending_score function');

  console.log('✅ Community Phase 1 migration completed');
};

export const down = async (db) => {
  await db.query(`
    DROP TABLE IF EXISTS post_hashtags CASCADE;
    DROP TABLE IF EXISTS hashtags CASCADE;
    DROP TABLE IF EXISTS post_views CASCADE;
    DROP TABLE IF EXISTS user_blocks CASCADE;
    DROP TABLE IF EXISTS bookmarks CASCADE;
    DROP FUNCTION IF EXISTS calculate_trending_score CASCADE;
    
    ALTER TABLE posts DROP COLUMN IF EXISTS view_count;
    ALTER TABLE posts DROP COLUMN IF EXISTS trending_score;
    ALTER TABLE posts DROP COLUMN IF EXISTS bookmark_count;
  `);
  
  console.log('✅ Community Phase 1 migration rolled back');
};

