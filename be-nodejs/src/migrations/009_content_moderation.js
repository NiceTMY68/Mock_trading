/**
 * Migration: Content Moderation System
 * 
 * Tables:
 * - banned_keywords: Từ khóa/patterns cấm
 * - content_flags: Flags cho posts vi phạm (chờ admin xét duyệt)
 * - removed_posts: Lưu trữ bài viết bị xóa
 * - content_reports: Reports từ users
 * 
 * Updates:
 * - users: Thêm trust_level
 */

export const up = async (db) => {
  // 1. Bảng banned_keywords - Lưu trữ từ khóa/patterns cấm
  await db.query(`
    CREATE TABLE IF NOT EXISTS banned_keywords (
      id SERIAL PRIMARY KEY,
      keyword VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'general',
      -- Categories: scam, phishing, ponzi, security, badword, illegal, spam
      severity VARCHAR(20) NOT NULL DEFAULT 'medium',
      -- Severity: low, medium, high, critical
      is_regex BOOLEAN DEFAULT FALSE,
      -- TRUE nếu keyword là regex pattern
      language VARCHAR(10) DEFAULT 'all',
      -- Language: vi, en, zh, all
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_banned_keywords_category ON banned_keywords(category);
    CREATE INDEX idx_banned_keywords_active ON banned_keywords(is_active);
  `);

  // 2. Bảng content_flags - Flags cho posts vi phạm (chờ admin xét duyệt)
  await db.query(`
    CREATE TABLE IF NOT EXISTS content_flags (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      flag_type VARCHAR(50) NOT NULL,
      -- Types: auto_detected, user_reported
      matched_keywords TEXT[],
      -- Các keywords đã match
      severity VARCHAR(20) NOT NULL DEFAULT 'medium',
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      -- Status: pending, approved, rejected
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at TIMESTAMP WITH TIME ZONE,
      review_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_content_flags_post ON content_flags(post_id);
    CREATE INDEX idx_content_flags_status ON content_flags(status);
    CREATE INDEX idx_content_flags_type ON content_flags(flag_type);
  `);

  // 3. Bảng removed_posts - Lưu trữ bài viết bị xóa
  await db.query(`
    CREATE TABLE IF NOT EXISTS removed_posts (
      id SERIAL PRIMARY KEY,
      original_post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      tags TEXT[],
      removal_reason TEXT,
      matched_keywords TEXT[],
      removed_by INTEGER REFERENCES users(id),
      -- Admin đã xóa
      original_created_at TIMESTAMP WITH TIME ZONE,
      removed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_removed_posts_user ON removed_posts(user_id);
    CREATE INDEX idx_removed_posts_removed_at ON removed_posts(removed_at);
  `);

  // 4. Update content_reports table nếu chưa có đủ fields
  await db.query(`
    -- Ensure content_reports exists with proper structure
    CREATE TABLE IF NOT EXISTS content_reports (
      id SERIAL PRIMARY KEY,
      reporter_id INTEGER NOT NULL REFERENCES users(id),
      target_type VARCHAR(20) NOT NULL,
      -- Types: post, comment, user
      target_id INTEGER NOT NULL,
      reason VARCHAR(100) NOT NULL,
      description TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      -- Status: pending, reviewed, dismissed, action_taken
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at TIMESTAMP WITH TIME ZONE,
      review_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
    CREATE INDEX IF NOT EXISTS idx_content_reports_target ON content_reports(target_type, target_id);
  `);

  // 5. Update users table - Thêm trust_level
  await db.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'trust_level'
      ) THEN
        ALTER TABLE users ADD COLUMN trust_level VARCHAR(20) DEFAULT 'normal';
        -- Levels: normal, low_trust, trusted, verified
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'removed_posts_count'
      ) THEN
        ALTER TABLE users ADD COLUMN removed_posts_count INTEGER DEFAULT 0;
      END IF;
    END $$;
  `);

  // 6. Insert default banned keywords - MULTI-LANGUAGE
  await db.query(`
    INSERT INTO banned_keywords (keyword, category, severity, is_regex, language, description) VALUES
    
    -- ==================== SCAM PATTERNS ====================
    -- Vietnamese
    ('gửi.*nhận.*gấp', 'scam', 'high', TRUE, 'vi', 'Giveaway scam pattern'),
    ('lãi suất.*[3-9][0-9]%.*tháng', 'ponzi', 'high', TRUE, 'vi', 'Lãi suất cao bất thường'),
    ('F1.*F2.*hoa hồng', 'ponzi', 'high', TRUE, 'vi', 'MLM/Ponzi pattern'),
    ('đầu tư.*lãi.*cam kết', 'scam', 'medium', TRUE, 'vi', 'Investment scam'),
    ('rút tiền.*24h.*100%', 'scam', 'high', TRUE, 'vi', 'Quick withdrawal scam'),
    ('kiếm tiền.*dễ dàng', 'scam', 'medium', TRUE, 'vi', 'Easy money scam'),
    ('thu nhập thụ động', 'scam', 'low', FALSE, 'vi', 'Passive income scam'),
    
    -- English
    ('send.*receive.*double', 'scam', 'high', TRUE, 'en', 'Giveaway scam pattern'),
    ('guaranteed.*profit', 'scam', 'high', TRUE, 'en', 'Guaranteed profit scam'),
    ('100%.*return', 'scam', 'high', TRUE, 'en', 'Unrealistic returns'),
    ('send.*[0-9].*eth.*get.*[0-9]', 'scam', 'critical', TRUE, 'en', 'ETH giveaway scam'),
    ('airdrop.*verify.*wallet', 'phishing', 'critical', TRUE, 'en', 'Fake airdrop phishing'),
    ('free.*crypto.*claim', 'scam', 'high', TRUE, 'en', 'Free crypto scam'),
    ('investment.*opportunity.*limited', 'scam', 'medium', TRUE, 'en', 'Limited investment scam'),
    ('make.*money.*fast', 'scam', 'medium', TRUE, 'en', 'Fast money scam'),
    ('risk.*free.*profit', 'scam', 'high', TRUE, 'en', 'Risk free profit scam'),
    
    -- Chinese (简体/繁體)
    ('发送.*获得.*双倍', 'scam', 'high', TRUE, 'zh', 'Giveaway scam - Chinese'),
    ('保证.*收益', 'scam', 'high', TRUE, 'zh', 'Guaranteed profit - Chinese'),
    ('免费.*空投', 'scam', 'medium', TRUE, 'zh', 'Free airdrop scam - Chinese'),
    ('日赚.*元', 'scam', 'high', TRUE, 'zh', 'Daily profit scam - Chinese'),
    ('稳赚不赔', 'scam', 'critical', FALSE, 'zh', 'No loss guaranteed - Chinese'),
    
    -- Korean
    ('보내면.*받기', 'scam', 'high', TRUE, 'ko', 'Send to receive scam - Korean'),
    ('수익.*보장', 'scam', 'high', TRUE, 'ko', 'Guaranteed profit - Korean'),
    ('무료.*에어드롭', 'scam', 'medium', TRUE, 'ko', 'Free airdrop - Korean'),
    
    -- Japanese
    ('送金.*倍返し', 'scam', 'high', TRUE, 'ja', 'Double return scam - Japanese'),
    ('利益.*保証', 'scam', 'high', TRUE, 'ja', 'Guaranteed profit - Japanese'),
    
    -- Indonesian
    ('kirim.*terima.*ganda', 'scam', 'high', TRUE, 'id', 'Double return scam - Indonesian'),
    ('keuntungan.*dijamin', 'scam', 'high', TRUE, 'id', 'Guaranteed profit - Indonesian'),
    ('investasi.*aman', 'scam', 'medium', TRUE, 'id', 'Safe investment scam - Indonesian'),
    
    -- Spanish
    ('enviar.*recibir.*doble', 'scam', 'high', TRUE, 'es', 'Double return scam - Spanish'),
    ('ganancia.*garantizada', 'scam', 'high', TRUE, 'es', 'Guaranteed profit - Spanish'),
    
    -- Russian
    ('отправить.*получить.*вдвое', 'scam', 'high', TRUE, 'ru', 'Double return scam - Russian'),
    ('гарантированная.*прибыль', 'scam', 'high', TRUE, 'ru', 'Guaranteed profit - Russian'),
    
    -- ==================== PHISHING DOMAINS ====================
    ('metamask-', 'phishing', 'critical', FALSE, 'all', 'Fake Metamask domain'),
    ('trustwallet-', 'phishing', 'critical', FALSE, 'all', 'Fake TrustWallet domain'),
    ('binancee', 'phishing', 'critical', FALSE, 'all', 'Fake Binance domain'),
    ('coinbasee', 'phishing', 'critical', FALSE, 'all', 'Fake Coinbase domain'),
    ('pancakeswap-', 'phishing', 'critical', FALSE, 'all', 'Fake PancakeSwap domain'),
    ('uniswapp', 'phishing', 'critical', FALSE, 'all', 'Fake Uniswap domain'),
    ('connect.*wallet.*verify', 'phishing', 'high', TRUE, 'all', 'Wallet verification phishing'),
    ('claim.*token.*connect', 'phishing', 'high', TRUE, 'all', 'Token claim phishing'),
    
    -- ==================== SECURITY PATTERNS ====================
    ('private.*key.*[a-fA-F0-9]{64}', 'security', 'critical', TRUE, 'all', 'Private key exposure'),
    ('seed.*phrase', 'security', 'high', TRUE, 'all', 'Seed phrase mention'),
    ('mnemonic.*word', 'security', 'high', TRUE, 'all', 'Mnemonic mention'),
    ('12.*word.*recovery', 'security', 'high', TRUE, 'all', '12-word recovery phrase'),
    ('24.*word.*backup', 'security', 'high', TRUE, 'all', '24-word backup phrase'),
    ('khóa.*riêng', 'security', 'high', TRUE, 'vi', 'Private key - Vietnamese'),
    ('私钥', 'security', 'high', FALSE, 'zh', 'Private key - Chinese'),
    
    -- ==================== ILLEGAL ACTIVITIES ====================
    ('mixer', 'illegal', 'high', FALSE, 'all', 'Crypto mixer'),
    ('tumbler', 'illegal', 'high', FALSE, 'all', 'Crypto tumbler'),
    ('rửa tiền', 'illegal', 'critical', FALSE, 'vi', 'Money laundering - Vietnamese'),
    ('trốn thuế', 'illegal', 'high', FALSE, 'vi', 'Tax evasion - Vietnamese'),
    ('洗钱', 'illegal', 'critical', FALSE, 'zh', 'Money laundering - Chinese'),
    ('money.*launder', 'illegal', 'critical', TRUE, 'en', 'Money laundering - English'),
    ('tax.*evasion', 'illegal', 'high', TRUE, 'en', 'Tax evasion - English'),
    
    -- ==================== BAD WORDS - VIETNAMESE ====================
    ('địt', 'badword', 'medium', FALSE, 'vi', 'Vietnamese profanity'),
    ('đụ', 'badword', 'medium', FALSE, 'vi', 'Vietnamese profanity'),
    ('lồn', 'badword', 'medium', FALSE, 'vi', 'Vietnamese profanity'),
    ('cặc', 'badword', 'medium', FALSE, 'vi', 'Vietnamese profanity'),
    ('đéo', 'badword', 'low', FALSE, 'vi', 'Vietnamese profanity'),
    ('vãi', 'badword', 'low', FALSE, 'vi', 'Vietnamese profanity'),
    ('đù má', 'badword', 'medium', FALSE, 'vi', 'Vietnamese profanity'),
    ('chó đẻ', 'badword', 'high', FALSE, 'vi', 'Vietnamese insult'),
    ('ngu', 'badword', 'low', FALSE, 'vi', 'Vietnamese insult'),
    ('khốn nạn', 'badword', 'medium', FALSE, 'vi', 'Vietnamese insult'),
    
    -- ==================== BAD WORDS - ENGLISH ====================
    ('fuck', 'badword', 'medium', FALSE, 'en', 'English profanity'),
    ('shit', 'badword', 'low', FALSE, 'en', 'English profanity'),
    ('bitch', 'badword', 'medium', FALSE, 'en', 'English profanity'),
    ('asshole', 'badword', 'medium', FALSE, 'en', 'English profanity'),
    ('bastard', 'badword', 'medium', FALSE, 'en', 'English profanity'),
    ('cunt', 'badword', 'high', FALSE, 'en', 'English profanity'),
    ('nigger', 'badword', 'critical', FALSE, 'en', 'Racial slur'),
    ('faggot', 'badword', 'critical', FALSE, 'en', 'Homophobic slur'),
    
    -- ==================== BAD WORDS - CHINESE ====================
    ('他妈的', 'badword', 'medium', FALSE, 'zh', 'Chinese profanity'),
    ('傻逼', 'badword', 'medium', FALSE, 'zh', 'Chinese profanity'),
    ('操你', 'badword', 'high', FALSE, 'zh', 'Chinese profanity'),
    ('狗娘养', 'badword', 'high', FALSE, 'zh', 'Chinese insult'),
    ('死全家', 'badword', 'critical', FALSE, 'zh', 'Chinese curse'),
    
    -- ==================== BAD WORDS - INDONESIAN ====================
    ('kontol', 'badword', 'medium', FALSE, 'id', 'Indonesian profanity'),
    ('memek', 'badword', 'medium', FALSE, 'id', 'Indonesian profanity'),
    ('anjing', 'badword', 'medium', FALSE, 'id', 'Indonesian insult'),
    ('bangsat', 'badword', 'medium', FALSE, 'id', 'Indonesian insult'),
    ('goblok', 'badword', 'low', FALSE, 'id', 'Indonesian insult'),
    
    -- ==================== BAD WORDS - KOREAN ====================
    ('씨발', 'badword', 'high', FALSE, 'ko', 'Korean profanity'),
    ('개새끼', 'badword', 'high', FALSE, 'ko', 'Korean insult'),
    ('병신', 'badword', 'medium', FALSE, 'ko', 'Korean insult'),
    
    -- ==================== BAD WORDS - JAPANESE ====================
    ('くそ', 'badword', 'low', FALSE, 'ja', 'Japanese profanity'),
    ('ばか', 'badword', 'low', FALSE, 'ja', 'Japanese insult'),
    ('死ね', 'badword', 'high', FALSE, 'ja', 'Japanese curse'),
    
    -- ==================== SPAM PATTERNS ====================
    ('telegram.*t\\.me', 'spam', 'medium', TRUE, 'all', 'Telegram link spam'),
    ('whatsapp.*wa\\.me', 'spam', 'medium', TRUE, 'all', 'WhatsApp link spam'),
    ('liên hệ.*zalo', 'spam', 'low', TRUE, 'vi', 'Zalo contact spam'),
    ('join.*group.*now', 'spam', 'low', TRUE, 'en', 'Group join spam'),
    ('click.*link.*bio', 'spam', 'low', TRUE, 'en', 'Link in bio spam'),
    ('dm.*for.*more', 'spam', 'low', TRUE, 'en', 'DM spam'),
    
    -- ==================== HATE SPEECH ====================
    ('kill.*all', 'hate', 'critical', TRUE, 'en', 'Violence incitement'),
    ('death.*to', 'hate', 'critical', TRUE, 'en', 'Violence incitement'),
    ('giết.*hết', 'hate', 'critical', TRUE, 'vi', 'Violence incitement - Vietnamese'),
    ('消灭', 'hate', 'critical', FALSE, 'zh', 'Eliminate - Chinese')
    
    ON CONFLICT DO NOTHING;
  `);

  console.log('✅ Content moderation tables created successfully');
};

export const down = async (db) => {
  await db.query(`
    DROP TABLE IF EXISTS content_flags CASCADE;
    DROP TABLE IF EXISTS removed_posts CASCADE;
    DROP TABLE IF EXISTS banned_keywords CASCADE;
    
    ALTER TABLE users DROP COLUMN IF EXISTS trust_level;
    ALTER TABLE users DROP COLUMN IF EXISTS removed_posts_count;
  `);
  
  console.log('✅ Content moderation tables dropped');
};

