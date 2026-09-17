#!/bin/bash

# ═══════════════════════════════════════════════════════════════════
# Setup Script untuk Deploy Indowebsite
# 
# Instruksi:
# 1. SSH ke hosting: ssh username@your-hosting.com
# 2. Download script: curl -O https://your-repo/setup-hosting.sh
# 3. Jalankan: bash setup-hosting.sh
# ═══════════════════════════════════════════════════════════════════

set -e  # Exit jika ada error

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║      Setup Aplikasi Pusat Arsip Anka ke Indowebsite          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# 1. Clone repository
echo "📦 Step 1: Cloning repository..."
if [ -d "ARSIPHOST" ]; then
    echo "  ⚠️  ARSIPHOST sudah ada, skip clone"
else
    git clone https://github.com/your-username/ARSIPHOST.git
    echo "  ✅ Repository cloned"
fi

cd ARSIPHOST

# 2. Install Node.js jika belum (optional - cek dulu)
echo ""
echo "🔍 Step 2: Checking Node.js..."
if command -v node &> /dev/null; then
    echo "  ✅ Node.js sudah terinstall: $(node --version)"
else
    echo "  ⚠️  Node.js tidak ditemukan. Install manual atau gunakan cPanel App Manager"
fi

# 3. Install NPM dependencies
echo ""
echo "📚 Step 3: Installing NPM dependencies..."
npm install --production
echo "  ✅ Dependencies installed"

# 4. Create logs directory
echo ""
echo "📁 Step 4: Creating logs directory..."
mkdir -p logs
echo "  ✅ Logs directory created"

# 5. Create .env file
echo ""
echo "⚙️  Step 5: Creating .env file..."
if [ -f "backend/.env" ]; then
    echo "  ⚠️  .env sudah ada, skip creation"
    echo "  📝 Update .env dengan nilai:"
    echo "     - SUPABASE_URL"
    echo "     - SUPABASE_SERVICE_ROLE_KEY"
    echo "     - JWT_SECRET"
    echo "     - SESSION_SECRET"
    echo "     - ALLOWED_ORIGINS"
else
    cp backend/.env.example backend/.env
    echo "  ✅ .env created dari .env.example"
    echo "  📝 Edit backend/.env dengan nilai Supabase Anda:"
    echo "     nano backend/.env"
fi

# 6. Generate secrets
echo ""
echo "🔐 Step 6: Generate secrets (copy ke .env)..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

echo "  JWT_SECRET (copy ke .env):"
echo "  >>> $JWT_SECRET"
echo ""
echo "  SESSION_SECRET (copy ke .env):"
echo "  >>> $SESSION_SECRET"

# 7. Install PM2
echo ""
echo "🚀 Step 7: Installing PM2..."
npm install -g pm2
echo "  ✅ PM2 installed"

# 8. Create ecosystem file
echo ""
echo "⚙️  Step 8: Creating ecosystem.config.js..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'arsiphost',
    script: './backend/server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF
echo "  ✅ ecosystem.config.js created"

# 9. Setup PM2 startup
echo ""
echo "🔄 Step 9: Setup PM2 startup..."
pm2 startup > /dev/null 2>&1 || true
echo "  ✅ PM2 startup configured"

# 10. Summary
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                   ✅ Setup Complete!                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 NEXT STEPS:"
echo ""
echo "1. Edit backend/.env dengan Supabase credentials:"
echo "   nano backend/.env"
echo ""
echo "   Isi dengan:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - JWT_SECRET (dari output di atas)"
echo "   - SESSION_SECRET (dari output di atas)"
echo "   - ALLOWED_ORIGINS (domain Anda)"
echo ""
echo "2. Test aplikasi:"
echo "   npm start"
echo ""
echo "3. Jika OK, stop dengan Ctrl+C lalu start dengan PM2:"
echo "   pm2 start ecosystem.config.js"
echo ""
echo "4. Setup domain di cPanel:"
echo "   - Add Addon Domain"
echo "   - Point ke reverse proxy port 8080"
echo "   - Setup SSL certificate"
echo ""
echo "5. Buat .htaccess di public_html/your-domain.com/"
echo "   untuk reverse proxy ke localhost:8080"
echo ""
echo "6. Monitor:"
echo "   pm2 logs arsiphost"
echo "   pm2 status"
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Generated Secrets (simpan di .env):                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "JWT_SECRET=$JWT_SECRET"
echo ""
echo "SESSION_SECRET=$SESSION_SECRET"
echo ""
