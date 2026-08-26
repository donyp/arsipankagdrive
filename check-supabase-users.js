#!/usr/bin/env node

const https = require('https');

const SUPABASE_URL = 'https://ehdqcxzdmmcwbdwkinyr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHFjeHpkbW1jd2Jkd2tpbnlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYyNDcxNiwiZXhwIjoyMDkyMjAwNzE2fQ.4c2_rOut7hQZJIbvLIBOKzTpo7kchbpU2Cj-dzCpmjw';

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
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve({ raw: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function main() {
    console.log('🗄️  Checking Supabase Users...\n');

    try {
        // Query users table
        console.log('📋 Fetching users from database...');
        const result = await supabaseRequest('GET', '/rest/v1/users?select=id,email,role,is_active');
        
        if (Array.isArray(result)) {
            console.log(`✅ Found ${result.length} users:\n`);
            result.forEach((user, i) => {
                console.log(`${i+1}. Email: ${user.email}`);
                console.log(`   Role: ${user.role}`);
                console.log(`   Active: ${user.is_active}`);
                console.log('');
            });
        } else if (result.message) {
            console.log(`⚠️  Message: ${result.message}`);
            console.log(`Full response:`, JSON.stringify(result, null, 2));
        } else {
            console.log('Response:', JSON.stringify(result, null, 2));
        }

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

main();
