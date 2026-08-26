#!/usr/bin/env node

const https = require('https');

const SUPABASE_URL = 'https://ehdqcxzdmmcwbdwkinyr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHFjeHpkbW1jd2Jkd2tpbnlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYyNDcxNiwiZXhwIjoyMDkyMjAwNzE2fQ.4c2_rOut7hQZJIbvLIBOKzTpo7kchbpU2Cj-dzCpmjw';

function supabaseRequest(method, path) {
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
        req.end();
    });
}

async function main() {
    console.log('🔍 Searching for all data in Supabase...\n');

    const tables = [
        'files',
        'invoices',
        'documents',
        'terabox_files',
        'legacy_files',
        'metadata_backups',
        'sync_queue',
    ];

    for (const table of tables) {
        try {
            console.log(`📋 Checking table: ${table}`);
            const result = await supabaseRequest('GET', `/rest/v1/${table}?select=count=exact`);
            
            if (Array.isArray(result)) {
                console.log(`   ✅ Found ${result.length} records\n`);
            } else if (result.code === '42P01') {
                console.log(`   ❌ Table does not exist\n`);
            } else {
                console.log(`   Response: ${JSON.stringify(result).substring(0, 80)}\n`);
            }
        } catch (e) {
            console.log(`   ❌ Error: ${e.message}\n`);
        }
    }

    console.log('✅ Scan complete');
}

main();
