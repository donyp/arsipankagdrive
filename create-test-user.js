#!/usr/bin/env node

const https = require('https');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = 'https://ehdqcxzdmmcwbdwkinyr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHFjeHpkbW1jd2Jkd2tpbnlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYyNDcxNiwiImV4cCI6MjA5MjIwMDcxNn0.4c2_rOut7hQZJIbvLIBOKzTpo7kchbpU2Cj-dzCpmjw';

function supabaseRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(SUPABASE_URL + path);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function main() {
    console.log('👤 Creating Test User in Database...\n');

    try {
        // Hash password
        const password = 'test12345';
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        console.log(`Creating user: test@arsip.local / ${password}`);
        console.log(`Hashed password: ${hashedPassword.substring(0, 50)}...\n`);

        // Insert new user
        const userData = {
            email: 'test@arsip.local',
            name: 'Test User',
            password_hash: hashedPassword,
            role: 'super_admin',
            is_active: true,
            zona_id: null,
            toko_id: null,
            permissions: ['upload_single', 'upload_batch', 'view_all_files']
        };

        console.log('📝 Inserting into database...');
        const result = await supabaseRequest('POST', '/rest/v1/users', userData);
        
        console.log(`Status: ${result.status}`);
        if (result.status === 201 || result.status === 200) {
            console.log(`✅ User created successfully!`);
            console.log(`Response:`, JSON.stringify(result.data, null, 2));
        } else {
            console.log(`⚠️ Response:`, JSON.stringify(result.data, null, 2));
        }

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

main();
