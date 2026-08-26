#!/usr/bin/env node

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
    console.log('🔍 Finding Working Credentials...\n');

    const admins = [
        { email: 'adminasep', password: 'adminasep' },
        { email: 'adminasep', password: 'admin123' },
        { email: 'adminasep', password: 'password' },
        { email: 'moderator', password: 'moderator' },
        { email: 'moderator', password: 'admin123' },
        { email: 'adminpuput', password: 'adminpuput' },
        { email: 'adminarif', password: 'adminarif' },
        { email: 'zona1', password: 'zona1' },
        { email: 'zona2', password: 'zona2' },
        { email: 'zona1', password: 'admin123' },
    ];

    for (const user of admins) {
        try {
            console.log(`🔐 Trying: ${user.email} / ${user.password}`);
            const result = await request('POST', '/api/auth/login', user);
            
            if (result.token) {
                console.log(`   ✅✅✅ SUCCESS! ✅✅✅`);
                console.log(`\n🎉 WORKING CREDENTIALS FOUND:`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Password: ${user.password}`);
                console.log(`\n   Token: ${result.token.substring(0, 100)}...`);
                console.log(`   User Info:`, result.user);
                process.exit(0);
            } else if (result.error) {
                console.log(`   ❌ ${result.error}`);
            }
        } catch (e) {
            console.log(`   ❌ Error: ${e.message}`);
        }
    }

    console.log('\n⚠️ No credentials found from standard passwords');
    console.log('🔧 Need to check if passwords are set in database');
}

main();
