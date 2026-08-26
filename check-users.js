#!/usr/bin/env node

// Simple HTTP client to check users without dependencies
const http = require('http');

function request(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve({ raw: body, error: e.message });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function main() {
    console.log('📊 Checking Database Users & Login...\n');

    // Test users to try
    const testUsers = [
        { email: 'admin@arsipanka.com', password: 'admin123' },
        { email: 'admin@localhost', password: 'admin' },
        { email: 'test@test.com', password: 'test' },
        { email: 'user@test.com', password: 'user123' },
        { email: 'demo@demo.com', password: 'demo' },
    ];

    for (const user of testUsers) {
        try {
            console.log(`🔐 Trying: ${user.email} / ${user.password}`);
            const result = await request('POST', '/api/auth/login', user);
            
            if (result.token) {
                console.log(`   ✅ SUCCESS!`);
                console.log(`   Token: ${result.token.substring(0, 50)}...`);
                console.log(`   User: ${JSON.stringify(result.user)}\n`);
                
                // Now try to get files with this token
                console.log(`📋 Trying to get files with this token...`);
                const filesResult = await request('GET', '/api/files');
                // This will fail without auth header, but we're testing token
                console.log(`   Result: ${JSON.stringify(filesResult).substring(0, 100)}\n`);
                
            } else if (result.error) {
                console.log(`   ❌ ${result.error}`);
            } else {
                console.log(`   ❌ Unknown error: ${JSON.stringify(result).substring(0, 50)}`);
            }
        } catch (e) {
            console.log(`   ❌ Error: ${e.message}`);
        }
    }

    console.log('✅ Check complete');
}

main();
