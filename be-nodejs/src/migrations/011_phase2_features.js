/**
 * Migration: Phase 2 Features
 * 
 * Tables:
 * - notification_settings: User notification preferences
 * - post_images: Images attached to posts
 * - uploads: Track all uploaded files
 */

export const up = async (db) => {
  // 1. Notification Settings table
  await db.query(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      
      -- Email notifications
      email_enabled BOOLEAN DEFAULT TRUE,
      email_new_follower BOOLEAN DEFAULT TRUE,
      email_new_comment BOOLEAN DEFAULT TRUE,
      email_new_reaction BOOLEAN DEFAULT TRUE,
      email_new_post_from_following BOOLEAN DEFAULT TRUE,
      email_mentions BOOLEAN DEFAULT TRUE,
      email_announcements BOOLEAN DEFAULT TRUE,
      
      -- Push notifications (in-app)
      push_enabled BOOLEAN DEFAULT TRUE,
      push_new_follower BOOLEAN DEFAULT TRUE,
      push_new_comment BOOLEAN DEFAULT TRUE,
      push_new_reaction BOOLEAN DEFAULT TRUE,
      push_new_post_from_following BOOLEAN DEFAULT TRUE,
      push_mentions BOOLEAN DEFAULT TRUE,
      push_announcements BOOLEAN DEFAULT TRUE,
      push_price_alerts BOOLEAN DEFAULT TRUE,
      
      -- Digest settings
      digest_enabled BOOLEAN DEFAULT FALSE,
      digest_frequency VARCHAR(20) DEFAULT 'daily',
      -- Options: 'daily', 'weekly', 'never'
      
      -- Quiet hours
      quiet_hours_enabled BOOLEAN DEFAULT FALSE,
      quiet_hours_start TIME DEFAULT '22:00',
      quiet_hours_end TIME DEFAULT '08:00',
      
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);
  `);
  console.log('✅ Created notification_settings table');

  // 2. Uploads table (track all uploaded files)
  await db.query(`
    CREATE TABLE IF NOT EXISTS uploads (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      original_name VARCHAR(255) NOT NULL,
      filename VARCHAR(255) NOT NULL UNIQUE,
      mimetype VARCHAR(100) NOT NULL,
      size INTEGER NOT NULL,
      -- Size in bytes
      path VARCHAR(500) NOT NULL,
      -- Relative path from uploads directory
      thumbnail_path VARCHAR(500),
      -- For images: thumbnail path
      width INTEGER,
      -- For images: original width
      height INTEGER,
      -- For images: original height
      upload_type VARCHAR(50) DEFAULT 'post',
      -- Types: post, avatar, cover, attachment
      is_public BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id);
    CREATE INDEX IF NOT EXISTS idx_uploads_type ON uploads(upload_type);
    CREATE INDEX IF NOT EXISTS idx_uploads_filename ON uploads(filename);
  `);
  console.log('✅ Created uploads table');

  // 3. Post Images junction table
  await db.query(`
    CREATE TABLE IF NOT EXISTS post_images (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      upload_id INTEGER NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
      position INTEGER DEFAULT 0,
      -- Order of images in the post
      caption TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, upload_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images(post_id);
    CREATE INDEX IF NOT EXISTS idx_post_images_upload ON post_images(upload_id);
  `);
  console.log('✅ Created post_images table');

  // 4. Add image_count to posts for quick access
  await db.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'image_count'
      ) THEN
        ALTER TABLE posts ADD COLUMN image_count INTEGER DEFAULT 0;
      END IF;
    END $$;
  `);
  console.log('✅ Added image_count to posts table');

  // 5. Create default notification settings for existing users
  await db.query(`
    INSERT INTO notification_settings (user_id)
    SELECT id FROM users
    WHERE id NOT IN (SELECT user_id FROM notification_settings)
    ON CONFLICT DO NOTHING;
  `);
  console.log('✅ Created default notification settings for existing users');

  console.log('✅ Phase 2 migration completed');
};

export const down = async (db) => {
  await db.query(`
    DROP TABLE IF EXISTS post_images CASCADE;
    DROP TABLE IF EXISTS uploads CASCADE;
    DROP TABLE IF EXISTS notification_settings CASCADE;
    
    ALTER TABLE posts DROP COLUMN IF EXISTS image_count;
  `);
  
  console.log('✅ Phase 2 migration rolled back');
};

