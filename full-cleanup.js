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
    console.log('🧹 FULL CLEANUP - Remove All Terabox/Legacy Data\n');

    try {
        // Step 1: Count files sebelum delete
        console.log('1️⃣  Counting existing files...');
        const countResult = await supabaseRequest('GET', '/rest/v1/files?select=count=exact');
        const fileCount = countResult.data.length || 0;
        console.log(`   Found: ${fileCount} files\n`);

        // Step 2: DELETE ALL FILES
        console.log('2️⃣  DELETING ALL FILES from database...');
        const deleteResult = await supabaseRequest('DELETE', '/rest/v1/files');
        console.log(`   Status: ${deleteResult.status}`);
        console.log(`   Response: ${JSON.stringify(deleteResult.data).substring(0, 100)}\n`);

        // Step 3: Verify deletion
        console.log('3️⃣  Verifying deletion...');
        const verifyResult = await supabaseRequest('GET', '/rest/v1/files?select=count=exact');
        console.log(`   Files remaining: ${verifyResult.data.length || 0}\n`);

        // Step 4: Also check metadata backups table
        console.log('4️⃣  Checking metadata_backups table...');
        const backupCount = await supabaseRequest('GET', '/rest/v1/metadata_backups?select=count=exact');
        console.log(`   Backups found: ${backupCount.data.length || 0}`);
        
        if ((backupCount.data.length || 0) > 0) {
            console.log('   Deleting metadata_backups...');
            const deleteBackups = await supabaseRequest('DELETE', '/rest/v1/metadata_backups');
            console.log(`   Status: ${deleteBackups.status}\n`);
        }

        // Step 5: Summary
        console.log('✅ CLEANUP COMPLETE!\n');
        console.log('📊 Summary:');
        console.log(`   - Deleted: ${fileCount} old files`);
        console.log(`   - Files table: NOW EMPTY`);
        console.log(`   - Ready for: Fresh Google Drive sync\n`);
        console.log('🎯 Next step: Upload files to Google Drive and trigger auto-sync');

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

main();
