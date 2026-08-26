# 🔐 Production Security Checklist

**Status**: Before Production Deployment  
**Date**: August 23, 2026  
**Priority**: HIGH

---

## ⚠️ Critical Security Updates Needed

Sebelum deploy ke production, ada beberapa security improvements yang HARUS dilakukan.

---

## 🔑 1. Generate New JWT_SECRET for Production

**Current Status**: 
```
JWT_SECRET=arsip-digital-super-secret-jwt-key-2026-change-me
Length: 49 chars ✅
```

### Why Update?
- Current secret adalah generic/shared
- Production harus unique per deployment
- Jika compromise, attacker dapat forge any JWT token

### How to Generate

#### Option 1: Using Node.js (Recommended)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Output example:
```
a7f8c3e2d9b1f4e6a9c2d8f1b4e7a9c2d8f1b4e7a9c2d8f1b4e7a9c2d8f1b4
```

#### Option 2: Using OpenSSL
```bash
openssl rand -hex 32
```

#### Option 3: Using pwgen (Linux)
```bash
pwgen -N 1 -s 64
```

### Implementation

**Step 1**: Generate new secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy output: `a7f8c3e2d9b1f4e6a9c2d8f1b4e7a9c2d8f1b4e7a9c2d8f1b4e7a9c2d8f1b4`

**Step 2**: Update `backend/.env`
```env
JWT_SECRET=a7f8c3e2d9b1f4e6a9c2d8f1b4e7a9c2d8f1b4e7a9c2d8f1b4e7a9c2d8f1b4
```

**Step 3**: Update in platform (if deployed)
- For HF Spaces: Settings > Variables
- For Cloud Run: Update Secret Manager
- For local: Restart server

### Verification
```bash
# Check length
echo "a7f8c3e2d9b1f4e6a9c2d8f1b4e7a9c2d8f1b4e7a9c2d8f1b4e7a9c2d8f1b4" | wc -c
# Should output: 65 (64 hex chars + newline)
```

**Checklist**:
- [ ] Generated new JWT_SECRET
- [ ] Updated in backend/.env
- [ ] Verified 64 hex characters
- [ ] Updated in deployment platform
- [ ] Restarted service

---

## 🔐 2. Update ALIST_ADMIN_PASSWORD for Production

**Current Status**:
```
ALIST_ADMIN_PASSWORD=admin123
Strength: WEAK (8 chars, no uppercase, no special chars)
```

### Why Update?
- `admin123` adalah default/predictable password
- Alist exposed ke network (local only atm, but still)
- Attacker bisa brute-force easily
- Production rule: min 12 chars, mixed case, numbers, symbols

### How to Generate Strong Password

#### Option 1: Node.js (Random)
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```
Output: `f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2`

#### Option 2: Manual (Memorable)
Pattern: `Prefix@YEAR!Domain#Number`
Example: `Arsip@2026!SecurePass123`

#### Option 3: Password Generator
- macOS: `openssl rand -base64 12 | tr -d '/'`
- Linux: `openssl rand -base64 12 | tr -d '/'`
- Windows: Use online generator (with caution)

### Recommended Passwords

| Type | Example | Strength |
|------|---------|----------|
| Random | `f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2` | Very Strong |
| Pattern | `Arsip@2026!SecurePass123` | Very Strong |
| Simple | `AlistPwd#2026!Secure` | Strong |

### Implementation

**Step 1**: Choose password (min 12 chars, mixed case, numbers, symbols)
```
Arsip@2026!SecurePass123
```

**Step 2**: Update `backend/.env`
```env
ALIST_ADMIN_PASSWORD=Arsip@2026!SecurePass123
```

**Step 3**: Update Alist with new password
```bash
# Inside Alist admin panel or database
# Change admin user password to match
```

**Step 4**: Verify in deployment
- HF Spaces: Set in Secrets
- Cloud Run: Update Secret Manager
- Local: Restart Alist

### Verification
```bash
# Check password strength
$pwd = "Arsip@2026!SecurePass123"
echo "Length: ${#pwd} chars"
echo "Has uppercase: $(if [[ $pwd =~ [A-Z] ]]; then echo 'Yes'; else echo 'No'; fi)"
echo "Has lowercase: $(if [[ $pwd =~ [a-z] ]]; then echo 'Yes'; else echo 'No'; fi)"
echo "Has numbers: $(if [[ $pwd =~ [0-9] ]]; then echo 'Yes'; else echo 'No'; fi)"
echo "Has symbols: $(if [[ $pwd =~ [!@#$%^&*] ]]; then echo 'Yes'; else echo 'No'; fi)"
```

**Checklist**:
- [ ] Generated strong password (min 12 chars)
- [ ] Updated in backend/.env
- [ ] Verified password requirements
- [ ] Updated Alist admin password
- [ ] Tested login with new password
- [ ] Updated in deployment platform

---

## 🔒 3. Protect .env File (Git)

**Current Status**: 
```
backend/.env exists but may not be in .gitignore
```

### Why?
- `.env` contains sensitive credentials
- If committed to git, exposed forever
- Others can access secrets if they clone repo

### How to Protect

**Step 1**: Check `.gitignore`
```bash
cat .gitignore | grep -i env
```

**Step 2**: If not found, add to `.gitignore`
```bash
echo "backend/.env" >> .gitignore
```

**Step 3**: Verify
```bash
# If already committed, remove from git history
git rm --cached backend/.env
git commit -m "Remove .env from version control"
```

**Checklist**:
- [ ] Verified `.env` in `.gitignore`
- [ ] Removed `.env` from git history (if committed)
- [ ] No .env files will be committed

---

## 🌐 4. For Deployment Platforms

### A. Hugging Face Spaces

**Before deploying:**
- [ ] Update JWT_SECRET
- [ ] Update ALIST_ADMIN_PASSWORD
- [ ] Do NOT commit `.env` file
- [ ] Set secrets via UI:
  - Settings > Variables and Secrets
  - Add: SUPABASE_URL
  - Add: SUPABASE_SERVICE_ROLE_KEY
  - Add: JWT_SECRET (new one)
  - Add: ALIST_ADMIN_PASSWORD (new one)

### B. Google Cloud Run

**Before deploying:**
- [ ] Update JWT_SECRET
- [ ] Update ALIST_ADMIN_PASSWORD
- [ ] Create Google Secret Manager secrets:
  ```bash
  echo "new-jwt-secret" | gcloud secrets create app-jwt-secret --data-file=-
  echo "new-alist-password" | gcloud secrets create arsip-alist-password --data-file=-
  ```
- [ ] Grant Cloud Run service account access
- [ ] Configure Secret Manager mounting in Cloud Run

### C. Local Development

**For local only:**
- [ ] Use `backend/.env` with dev credentials
- [ ] JWT_SECRET can be simpler
- [ ] ALIST_ADMIN_PASSWORD can be `admin123`
- [ ] Before committing: `.env` must be in `.gitignore`

---

## 🔑 5. Session Secret Management

**Current Status**:
```
SESSION_SECRET=nf/Fq4mlxNLqeICalePNYQMAl7a52b2pGVjeW/TfqtZfvF5H2ABAR6ZuJaDVD30n+Jca9O5UYwyXZLTfzy5Qsg==
Length: 86 chars ✅
```

### Recommendation
- If deploying to multiple instances: use same SECRET
- If deploying to single instance: can rotate regularly
- For shared session store: generate from secure source

### Rotation (Optional)
```bash
# Generate new session secret
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Update in `backend/.env`:
```env
SESSION_SECRET=<new-base64-value>
```

---

## 🚨 Pre-Deployment Security Checklist

### Critical (MUST DO)
- [ ] JWT_SECRET generated and updated (new unique value)
- [ ] ALIST_ADMIN_PASSWORD updated to strong password
- [ ] `.env` file added to `.gitignore`
- [ ] No `.env` files committed to git
- [ ] SUPABASE_SERVICE_ROLE_KEY not exposed
- [ ] FONNTE_TOKEN not exposed

### Recommended (SHOULD DO)
- [ ] SESSION_SECRET generated and stored securely
- [ ] Credentials stored in platform Secrets (not code)
- [ ] Used Secret Manager for Cloud Run
- [ ] Enable HTTPS in deployment (default in HF/Cloud Run)
- [ ] Enable RLS in Supabase
- [ ] Database backups configured

### Optional (NICE TO HAVE)
- [ ] Enable request signing
- [ ] Setup rate limiting
- [ ] Enable API key rotation policy
- [ ] Setup audit logging
- [ ] Configure WAF/DDoS protection

---

## 📝 Security Implementation Log

**Template for tracking changes:**

```
Date: 2026-08-23
Change: Generate new JWT_SECRET
Status: [  ] TODO [ ] DONE
Value: (keep secret, don't log)
Updated: backend/.env
Verified: Yes/No

Date: 2026-08-23
Change: Update ALIST_ADMIN_PASSWORD
Status: [  ] TODO [ ] DONE
Value: (keep secret, don't log)
Updated: backend/.env, Alist admin panel
Verified: Yes/No
```

---

## 🎯 Next Steps

### Option 1: Quick Production Deploy (1 hour)
```bash
# 1. Generate new JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy value

# 2. Update backend/.env
# Replace JWT_SECRET=...

# 3. Generate new ALIST_ADMIN_PASSWORD
# Use: Arsip@2026!NewSecurePass123

# 4. Update backend/.env
# Replace ALIST_ADMIN_PASSWORD=...

# 5. Verify .env in .gitignore
echo "backend/.env" >> .gitignore

# 6. Ready to deploy
```

### Option 2: Full Security Audit (2-3 hours)
Complete all items in Pre-Deployment Security Checklist above

---

## ✅ Deployment Readiness

| Item | Status | Priority |
|------|--------|----------|
| JWT_SECRET updated | ❌ TODO | CRITICAL |
| ALIST_ADMIN_PASSWORD updated | ❌ TODO | CRITICAL |
| .env in .gitignore | ✅ (need verify) | CRITICAL |
| No secrets in code | ✅ | CRITICAL |
| Supabase secured | ✅ | HIGH |
| Documentation ready | ✅ | MEDIUM |

---

## 🔐 Security Policies

### Password Policy
- Minimum length: 12 characters
- Mix of upper/lowercase
- At least 1 number
- At least 1 special character
- No dictionary words
- No sequential numbers/letters

### Secret Rotation
- JWT_SECRET: Every 3-6 months
- ALIST_ADMIN_PASSWORD: Every 6 months
- SESSION_SECRET: Every 6 months
- SUPABASE keys: On compromise only

### Credential Storage
- Local: `backend/.env` (git ignored)
- HF Spaces: Secrets UI
- Cloud Run: Google Secret Manager
- NEVER: In code, comments, or logs

---

## 📞 Questions?

1. How to generate cryptographically secure random values?
   → Use `crypto.randomBytes()` or `openssl rand`

2. What if ALIST_ADMIN_PASSWORD compromised?
   → Update in all places, restart services, monitor logs

3. Can I use same JWT_SECRET in multiple instances?
   → Yes, but if one is compromised, all are compromised

4. How often to rotate secrets?
   → Every 3-6 months, or immediately if compromised

5. Should I commit `.env.example` to git?
   → Yes! It shows what variables are needed (without values)

---

## ✨ Final Status

```
╔═════════════════════════════════════════════╗
║  SECURITY CHECKLIST: READY FOR REVIEW       ║
║  ✅ Environment setup complete              ║
║  ❌ Security updates pending                ║
║  → Generate JWT_SECRET (CRITICAL)          ║
║  → Update ALIST_ADMIN_PASSWORD (CRITICAL)  ║
║  → Verify .gitignore (CRITICAL)            ║
╚═════════════════════════════════════════════╝
```

**Next**: Complete security updates above before production deployment

---

**Document**: Production Security Checklist  
**Version**: 2.0  
**Last Updated**: August 23, 2026  
**Status**: READY FOR ACTION

