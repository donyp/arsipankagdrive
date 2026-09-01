-- Session Management & Device Tracking
-- Run this migration to add session tracking

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50), -- desktop, mobile, tablet
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address VARCHAR(45),
    location VARCHAR(255),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP,
    revoked_by UUID REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Create suspicious_activities table
CREATE TABLE IF NOT EXISTS suspicious_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(100) NOT NULL, -- multiple_login_failures, unusual_location, multiple_devices, etc
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    description TEXT,
    ip_address VARCHAR(45),
    location VARCHAR(255),
    metadata JSONB,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_suspicious_activities_user_id ON suspicious_activities(user_id);
CREATE INDEX idx_suspicious_activities_severity ON suspicious_activities(severity);
CREATE INDEX idx_suspicious_activities_resolved ON suspicious_activities(is_resolved) WHERE is_resolved = false;

-- Create FAQ categories table
CREATE TABLE IF NOT EXISTS faq_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    order_number INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create FAQ articles table
CREATE TABLE IF NOT EXISTS faq_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES faq_categories(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    tags TEXT[],
    order_number INT DEFAULT 0,
    views INT DEFAULT 0,
    helpful_count INT DEFAULT 0,
    not_helpful_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for FAQ
CREATE INDEX idx_faq_articles_category ON faq_articles(category_id);
CREATE INDEX idx_faq_articles_search ON faq_articles USING gin(to_tsvector('indonesian', question || ' ' || answer));

-- Insert default FAQ categories (skip if exists)
INSERT INTO faq_categories (name, description, icon, order_number) VALUES
('Dasar-dasar', 'Pertanyaan dasar tentang penggunaan sistem', '📚', 1),
('Upload & File Management', 'Cara upload dan mengelola file', '📤', 2),
('Pencarian & Filter', 'Cara mencari dan filter file', '🔍', 3),
('Berbagi File', 'Cara berbagi file dengan orang lain', '🔗', 4),
('Keamanan & Akun', 'Pertanyaan tentang keamanan dan akun', '🔐', 5),
('Troubleshooting', 'Solusi untuk masalah umum', '🔧', 6)
ON CONFLICT (name) DO NOTHING;

-- Insert sample FAQ articles
DO $$
DECLARE
    cat_dasar UUID;
    cat_upload UUID;
    cat_search UUID;
    cat_share UUID;
    cat_security UUID;
    cat_trouble UUID;
BEGIN
    SELECT id INTO cat_dasar FROM faq_categories WHERE name = 'Dasar-dasar';
    SELECT id INTO cat_upload FROM faq_categories WHERE name = 'Upload & File Management';
    SELECT id INTO cat_search FROM faq_categories WHERE name = 'Pencarian & Filter';
    SELECT id INTO cat_share FROM faq_categories WHERE name = 'Berbagi File';
    SELECT id INTO cat_security FROM faq_categories WHERE name = 'Keamanan & Akun';
    SELECT id INTO cat_trouble FROM faq_categories WHERE name = 'Troubleshooting';

    -- Dasar-dasar
    INSERT INTO faq_articles (category_id, question, answer, tags, order_number) VALUES
    (cat_dasar, 'Apa itu Arsip ANKA?', 'Arsip ANKA adalah sistem manajemen arsip digital yang membantu Anda menyimpan, mengorganisir, dan mengakses file invoice dan dokumen penting dengan aman dan terstruktur.', ARRAY['arsip', 'pengenalan'], 1),
    (cat_dasar, 'Siapa yang bisa menggunakan sistem ini?', 'Sistem ini dapat digunakan oleh:
- Super Admin: Akses penuh ke seluruh sistem
- Moderator: Monitoring dan approval
- Admin Zona: Mengelola file di zona masing-masing
- User: Akses terbatas untuk melihat dan download file', ARRAY['user', 'role', 'akses'], 2),
    
    -- Upload
    (cat_upload, 'Bagaimana cara upload file?', 'Cara upload file:
1. Klik tombol "Upload" di dashboard atau tekan Ctrl+U
2. Pilih zona dan toko
3. Pilih file dari komputer (PDF, JPG, PNG max 50MB)
4. Isi informasi: nominal, tanggal dokumen, kategori (PPN/NON)
5. Klik "Upload"
6. Tunggu hingga proses selesai', ARRAY['upload', 'file', 'tutorial'], 1),
    (cat_upload, 'Apa format file yang didukung?', 'Format file yang didukung:
- PDF (.pdf)
- Gambar (.jpg, .jpeg, .png)
- Ukuran maksimal: 50MB per file

Tips: Untuk file besar, kompres terlebih dahulu sebelum upload.', ARRAY['format', 'ukuran', 'pdf'], 2),
    (cat_upload, 'Bagaimana cara menghapus file?', 'Untuk menghapus file:
1. Buka detail file
2. Klik tombol "Hapus" (merah)
3. Konfirmasi penghapusan

Catatan: File yang dihapus tidak dapat dikembalikan. Pastikan file sudah tidak diperlukan.', ARRAY['delete', 'hapus'], 3),
    
    -- Search
    (cat_search, 'Bagaimana cara mencari file?', 'Cara mencari file:
1. Gunakan kotak pencarian di bagian atas dashboard
2. Ketik nama file, toko, atau nominal
3. Atau gunakan filter:
   - Filter tanggal: Pilih rentang tanggal
   - Filter toko: Pilih toko tertentu
   - Filter kategori: INVOICE, PPN, NON, PIUTANG
4. Klik "Cari" atau tekan Enter', ARRAY['search', 'cari', 'filter'], 1),
    (cat_search, 'Apa itu Quick Filter?', 'Quick Filter adalah tombol cepat untuk filter berdasarkan periode waktu:
- Hari Ini: File yang diupload hari ini
- Kemarin: File dari kemarin
- Minggu Ini: File 7 hari terakhir
- Minggu Lalu: File minggu sebelumnya
- Bulan Ini: File bulan berjalan
- Bulan Lalu: File bulan sebelumnya

Klik salah satu tombol untuk filter otomatis.', ARRAY['quick-filter', 'tanggal'], 2),
    
    -- Share
    (cat_share, 'Bagaimana cara berbagi file?', 'Cara berbagi file:
1. Buka detail file yang ingin dibagikan
2. Klik tombol "🔗 Share"
3. Pilih waktu kadaluarsa:
   - 1 jam (untuk file sangat sensitif)
   - 24 jam (untuk akses sementara)
   - 7 hari (untuk kolaborasi)
   - 30 hari (untuk akses jangka panjang)
   - Custom (tentukan sendiri)
4. Opsional: Set maksimal jumlah akses
5. Klik "Generate Share Link"
6. Copy link dan bagikan', ARRAY['share', 'berbagi', 'link'], 1),
    (cat_share, 'Bagaimana cara mencabut link berbagi?', 'Untuk mencabut link berbagi:
1. Buka detail file
2. Scroll ke bagian "Active Shares"
3. Klik tombol "Revoke" pada link yang ingin dicabut
4. Link akan langsung tidak aktif dan tidak bisa diakses lagi', ARRAY['revoke', 'cabut', 'share'], 2),
    
    -- Security
    (cat_security, 'Bagaimana cara mengganti password?', 'Cara mengganti password:
1. Klik nama Anda di pojok kanan atas
2. Pilih "Settings"
3. Ke tab "Security"
4. Masukkan password lama
5. Masukkan password baru (min 8 karakter)
6. Konfirmasi password baru
7. Klik "Update Password"

Tips: Gunakan password yang kuat dengan kombinasi huruf besar, kecil, angka, dan simbol.', ARRAY['password', 'security', 'ganti'], 1),
    (cat_security, 'Apa yang harus dilakukan jika lupa password?', 'Jika lupa password:
1. Klik "Lupa Password?" di halaman login
2. Masukkan email Anda
3. Cek email untuk link reset password
4. Klik link dalam email (valid 1 jam)
5. Buat password baru
6. Login dengan password baru

Jika tidak menerima email, cek folder Spam atau hubungi administrator.', ARRAY['lupa', 'reset', 'password'], 2),
    
    -- Troubleshooting
    (cat_trouble, 'Kenapa upload gagal?', 'Penyebab umum upload gagal:

1. **File terlalu besar** (>50MB)
   Solusi: Kompres file terlebih dahulu

2. **Koneksi internet terputus**
   Solusi: Pastikan koneksi stabil, coba lagi

3. **Format file tidak didukung**
   Solusi: Pastikan file PDF, JPG, atau PNG

4. **Storage penuh**
   Solusi: Hubungi administrator untuk menambah kapasitas

5. **Browser cache**
   Solusi: Clear cache browser atau gunakan mode incognito', ARRAY['upload', 'gagal', 'error', 'troubleshoot'], 1),
    (cat_trouble, 'Kenapa file tidak muncul di dashboard?', 'Penyebab file tidak muncul:

1. **File masih dalam proses sync** (tunggu 5-10 detik)
   Solusi: Refresh halaman (F5)

2. **Filter aktif**
   Solusi: Reset filter dengan klik "Reset Filters"

3. **Pencarian aktif**
   Solusi: Kosongkan kotak pencarian

4. **File di zona/toko lain**
   Solusi: Periksa filter zona dan toko

5. **Permission tidak cukup**
   Solusi: Hubungi administrator untuk akses', ARRAY['file', 'tidak-muncul', 'troubleshoot'], 2),
    (cat_trouble, 'Website lambat atau not responding', 'Solusi untuk website lambat:

1. **Check koneksi internet**
   - Pastikan koneksi stabil
   - Speed test (min 1 Mbps)

2. **Clear browser cache**
   - Chrome: Ctrl+Shift+Del
   - Pilih "Cached images and files"
   - Clear data

3. **Gunakan browser modern**
   - Chrome, Edge, atau Firefox (versi terbaru)

4. **Tutup tab lain**
   - Terlalu banyak tab bisa memperlambat

5. **Restart browser**
   - Tutup semua window browser
   - Buka lagi

Jika masih lambat, hubungi administrator.', ARRAY['lambat', 'slow', 'performance'], 3);
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON suspicious_activities TO authenticated;
GRANT SELECT ON faq_categories, faq_articles TO authenticated;
GRANT INSERT, UPDATE ON faq_articles TO authenticated; -- for feedback

COMMENT ON TABLE user_sessions IS 'Track user login sessions and devices';
COMMENT ON TABLE suspicious_activities IS 'Log suspicious activities for security monitoring';
COMMENT ON TABLE faq_categories IS 'Categories for FAQ knowledge base';
COMMENT ON TABLE faq_articles IS 'FAQ articles with search support';
