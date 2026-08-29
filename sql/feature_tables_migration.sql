-- ============================================================
-- Feature Tables Migration - Phase 1
-- System Health, Data Quality, Comments, FAQ
-- ============================================================

-- ============================================================
-- CREATE ENUM TYPES FIRST
-- ============================================================

DO $$ BEGIN
    CREATE TYPE severity_level AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE issue_severity AS ENUM ('info', 'warning', 'error');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE rule_type AS ENUM ('format', 'range', 'reference', 'pattern');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 1. SYSTEM HEALTH & MONITORING
-- ============================================================

CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value FLOAT NOT NULL,
    tags JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_metric_value CHECK (metric_value >= 0)
);

CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    severity severity_level DEFAULT 'info',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT
);

CREATE TABLE IF NOT EXISTS system_metrics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    min_value FLOAT,
    max_value FLOAT,
    avg_value FLOAT,
    error_count INT DEFAULT 0,
    CONSTRAINT unique_metric_date UNIQUE (date, metric_name)
);

-- Create indexes for system metrics
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_metrics_daily_date ON system_metrics_daily(date DESC);

-- ============================================================
-- 2. DATA QUALITY ASSURANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS data_quality_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    issue_type VARCHAR(50) NOT NULL,
    issue_description TEXT NOT NULL,
    severity issue_severity DEFAULT 'warning',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    auto_fixable BOOLEAN DEFAULT FALSE,
    suggested_fix JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_file_reference CHECK (file_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) UNIQUE NOT NULL,
    rule_type rule_type DEFAULT 'pattern',
    rule_config JSONB NOT NULL,
    severity issue_severity DEFAULT 'error',
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for data quality
CREATE INDEX IF NOT EXISTS idx_data_quality_file_id ON data_quality_issues(file_id);
CREATE INDEX IF NOT EXISTS idx_data_quality_issue_type ON data_quality_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_data_quality_resolved ON data_quality_issues(resolved);
CREATE INDEX IF NOT EXISTS idx_validation_rules_enabled ON validation_rules(enabled);

-- ============================================================
-- 3. COMMENTS & ANNOTATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS file_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    mentions UUID[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT valid_comment CHECK (LENGTH(comment) > 0 AND LENGTH(comment) <= 5000)
);

CREATE TABLE IF NOT EXISTS file_comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES file_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_reaction UNIQUE (comment_id, user_id, reaction)
);

-- Create indexes for comments
CREATE INDEX IF NOT EXISTS idx_file_comments_file_id ON file_comments(file_id);
CREATE INDEX IF NOT EXISTS idx_file_comments_user_id ON file_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_file_comments_created_at ON file_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_comments_resolved ON file_comments(resolved_at);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON file_comment_reactions(comment_id);

-- ============================================================
-- 4. FAQ KNOWLEDGE BASE
-- ============================================================

CREATE TABLE IF NOT EXISTS faq_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    order_number INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faq_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    order_number INT DEFAULT 0,
    views INT DEFAULT 0,
    helpful_count INT DEFAULT 0,
    not_helpful_count INT DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_article CHECK (
        LENGTH(question) > 0 AND LENGTH(question) <= 500 AND
        LENGTH(answer) > 0 AND LENGTH(answer) <= 10000
    )
);

CREATE TABLE IF NOT EXISTS faq_article_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES faq_articles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for FAQ
CREATE INDEX IF NOT EXISTS idx_faq_categories_order ON faq_categories(order_number);
CREATE INDEX IF NOT EXISTS idx_faq_articles_category_id ON faq_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_faq_articles_featured ON faq_articles(featured);
CREATE INDEX IF NOT EXISTS idx_faq_articles_views ON faq_articles(views DESC);
CREATE INDEX IF NOT EXISTS idx_faq_articles_tags ON faq_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_faq_articles_created_at ON faq_articles(created_at DESC);

-- ============================================================
-- Insert Default FAQ Categories
-- ============================================================

INSERT INTO faq_categories (name, description, icon, order_number) VALUES
('Uploading Files', 'Pertanyaan seputar upload file ke sistem', '📤', 1),
('File Management', 'Mengelola file yang sudah di-upload', '📁', 2),
('Searching & Filtering', 'Mencari dan filter file', '🔍', 3),
('Reports & Analytics', 'Laporan dan analitik sistem', '📊', 4),
('Troubleshooting', 'Pemecahan masalah umum', '🔧', 5),
('Account & Security', 'Akun dan keamanan', '🔐', 6)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Insert Default FAQ Articles
-- ============================================================

INSERT INTO faq_articles (category_id, question, answer, tags, order_number, featured)
SELECT 
    (SELECT id FROM faq_categories WHERE name = 'Uploading Files'),
    'Bagaimana cara upload file ke sistem?',
    'Langkah-langkah upload file:\n\n1. Klik menu "Upload" di sidebar\n2. Pilih "Zona" tempat file berasal\n3. Pilih "Toko" yang mengeluarkan invoice\n4. Pilih file dengan drag-drop atau klik tombol\n5. Isi nominal dan tanggal dokumen\n6. Pilih kategori (PPN/NON)\n7. Klik tombol "Upload"\n\nFile akan diproses dan tersimpan otomatis ke Google Drive.',
    ARRAY['upload', 'file', 'tutorial'],
    1,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM faq_articles WHERE question = 'Bagaimana cara upload file ke sistem?');

INSERT INTO faq_articles (category_id, question, answer, tags, order_number, featured)
SELECT 
    (SELECT id FROM faq_categories WHERE name = 'Uploading Files'),
    'Tipe file apa yang didukung?',
    'Sistem mendukung tipe file:\n\n✅ PDF (.pdf)\n✅ JPG/JPEG (.jpg, .jpeg)\n✅ PNG (.png)\n\nUkuran file maksimal:\n- Single file: 50MB\n- Batch upload: 200MB total\n\nJika file lebih besar, kompres terlebih dahulu atau gunakan progressive upload untuk file besar.',
    ARRAY['upload', 'file', 'type', 'size'],
    2,
    FALSE
WHERE NOT EXISTS (SELECT 1 FROM faq_articles WHERE question = 'Tipe file apa yang didukung?');

INSERT INTO faq_articles (category_id, question, answer, tags, order_number, featured)
SELECT 
    (SELECT id FROM faq_categories WHERE name = 'Uploading Files'),
    'Kenapa upload timeout?',
    'Untuk file besar (> 50MB), gunakan progressive upload:\n\n1. Go to Upload page\n2. Enable "Large File Upload" checkbox\n3. Upload akan dilakukan per-chunk (5MB per chunk)\n4. Jika terputus, resume otomatis saat reconnect\n\nAlternatif:\n- Kompres file dahulu\n- Split file menjadi beberapa bagian\n- Upload pada jam sepi (traffic rendah)',
    ARRAY['upload', 'timeout', 'large-file', 'troubleshoot'],
    3,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM faq_articles WHERE question = 'Kenapa upload timeout?');

INSERT INTO faq_articles (category_id, question, answer, tags, order_number, featured)
SELECT 
    (SELECT id FROM faq_categories WHERE name = 'File Management'),
    'Bagaimana cara download file?',
    'Langkah-langkah download file:\n\n1. Pergi ke Dashboard atau Search\n2. Cari file yang ingin didownload\n3. Klik tombol "Download" pada file\n4. File akan di-download langsung dari Google Drive\n\nNote: File akan di-cache selama 24 jam untuk download lebih cepat.',
    ARRAY['download', 'file', 'tutorial'],
    1,
    FALSE
WHERE NOT EXISTS (SELECT 1 FROM faq_articles WHERE question = 'Bagaimana cara download file?');

INSERT INTO faq_articles (category_id, question, answer, tags, order_number, featured)
SELECT 
    (SELECT id FROM faq_categories WHERE name = 'Searching & Filtering'),
    'Bagaimana cara search file?',
    'Ada beberapa cara untuk mencari file:\n\n1. **Search by Invoice Number**\n   - Masukkan nomor invoice di search box\n   - Hasil akan otomatis muncul\n\n2. **Filter by Category**\n   - Pilih kategori: INVOICE, PPN, NON, PIUTANG\n   - Sistem akan filter file sesuai kategori\n\n3. **Filter by Date Range**\n   - Klik "Filter" button\n   - Pilih tanggal mulai dan selesai\n   - Klik "Apply"\n\n4. **Filter by Toko**\n   - Pilih toko dari dropdown\n   - Lihat hanya file dari toko tersebut',
    ARRAY['search', 'filter', 'find'],
    1,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM faq_articles WHERE question = 'Bagaimana cara search file?');

INSERT INTO faq_articles (category_id, question, answer, tags, order_number, featured)
SELECT 
    (SELECT id FROM faq_categories WHERE name = 'Troubleshooting'),
    'File upload berhasil tapi tidak muncul di dashboard?',
    'Jika file upload berhasil tapi tidak muncul, coba langkah-langkah berikut:\n\n1. **Tunggu proses sync**\n   - Tunggu 5-10 detik dan refresh halaman\n   - Sistem auto-sync setiap 5 menit\n\n2. **Check filter**\n   - Verifikasi kategori filter (INVOICE vs PPN vs NON)\n   - Verifikasi zona filter\n   - Clear semua filter dan coba lagi\n\n3. **Check permission**\n   - Verifikasi Anda punya akses ke file tersebut\n   - Admin_zona hanya bisa lihat file zona mereka\n\n4. **Check system health**\n   - Pergi ke Admin > System Health\n   - Verifikasi semua sistem berjalan normal',
    ARRAY['troubleshoot', 'file-not-visible', 'sync'],
    1,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM faq_articles WHERE question = 'File upload berhasil tapi tidak muncul di dashboard?');

INSERT INTO faq_articles (category_id, question, answer, tags, order_number, featured)
SELECT 
    (SELECT id FROM faq_categories WHERE name = 'Troubleshooting'),
    'Nominal tidak terdeteksi otomatis?',
    'Pastikan nominal berada di filename dengan format yang benar:\n\n❌ Format SALAH:\n- invoice-balaraja-1500000.pdf\n- invoice_1500000.pdf\n\n✅ Format BENAR:\n- PPN 1.500.000 - Balaraja.pdf\n- 1.500.000 Balaraja Invoice.pdf\n- NON 2.300.000 Cianjur.pdf\n\nTips:\n- Gunakan titik sebagai separator (1.500.000, bukan 1500000)\n- Nominal sebaiknya di awal atau akhir filename\n- Hindari nominal dalam kurung\n- Hindari simbol Rp atau koma',
    ARRAY['troubleshoot', 'nominal', 'filename', 'detection'],
    2,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM faq_articles WHERE question = 'Nominal tidak terdeteksi otomatis?');

INSERT INTO faq_articles (category_id, question, answer, tags, order_number, featured)
SELECT 
    (SELECT id FROM faq_categories WHERE name = 'Account & Security'),
    'Bagaimana cara ganti password?',
    'Langkah-langkah ganti password:\n\n1. Klik ikon profil (icon orang) di top-right\n2. Pilih "Settings"\n3. Klik tab "Security"\n4. Masukkan password lama\n5. Masukkan password baru (minimal 8 karakter)\n6. Konfirmasi password baru\n7. Klik "Save"\n\nPassword akan diubah dan Anda akan otomatis logout.',
    ARRAY['password', 'security', 'account'],
    1,
    FALSE
WHERE NOT EXISTS (SELECT 1 FROM faq_articles WHERE question = 'Bagaimana cara ganti password?');

-- ============================================================
-- Insert Default Validation Rules
-- ============================================================

INSERT INTO validation_rules (rule_name, rule_type, rule_config, severity, enabled) VALUES
('filename_format', 'pattern', '{"pattern": "^(PPN|NON)?\\s+.+\\d+\\.pdf$", "message": "Filename harus format: [PPN/NON] nama nominal.pdf", "case_insensitive": true}', 'error', TRUE),
('nominal_positive', 'range', '{"min": 1, "max": 999999999, "message": "Nominal harus antara 1 - 999.999.999"}', 'error', TRUE),
('tanggal_not_future', 'pattern', '{"validator": "date_not_future", "message": "Tanggal tidak boleh masa depan"}', 'error', TRUE),
('file_size_limit', 'range', '{"max_bytes": 52428800, "message": "Ukuran file maksimal 50MB"}', 'error', TRUE),
('file_type_valid', 'pattern', '{"pattern": "\\.(pdf|jpg|jpeg|png)$", "message": "Tipe file hanya PDF, JPG, atau PNG", "case_insensitive": true}', 'error', TRUE),
('zona_matches_toko', 'reference', '{"type": "zona_toko_match", "message": "Zona harus sesuai dengan zona toko"}', 'error', TRUE),
('toko_exists', 'reference', '{"type": "toko_exists", "message": "Toko tidak ditemukan dalam database"}', 'error', TRUE),
('nominal_reasonable', 'range', '{"type": "anomaly_check", "deviation_factor": 2, "message": "Nominal jauh dari rata-rata, periksa kembali", "severity": "warning"}', 'warning', TRUE)
ON CONFLICT (rule_name) DO NOTHING;

-- ============================================================
-- Drop old enum type if it exists and create fresh
-- ============================================================
-- All Done!
-- ============================================================

