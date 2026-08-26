#!/usr/bin/env node

const http = require('http');

function apiRequest(path, method = 'GET', data = null) {
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
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        if (data) {
            const json = JSON.stringify(data);
            req.write(json);
        }
        req.end();
    });
}

async function main() {
    console.log('🔐 Testing Login & File List...\n');
    
    try {
        // Test 1: Try login
        console.log('1️⃣  Testing /api/auth/login...');
        const loginData = {
            email: 'admin@arsipanka.com',
            password: 'admin123'
        };
        
        console.log('   Sending:', loginData);
        let result = await apiRequest('/api/auth/login', 'POST', loginData);
        console.log(`   Status: ${result.status}`);
        console.log('   Response:', result.data);
        
        if (result.status === 200 && result.data.token) {
            const token = result.data.token;
            console.log(`\n   ✅ Login success! Token: ${token.substring(0, 20)}...`);
            
            // Test 2: Get files with token
            console.log('\n2️⃣  Getting file list with token...');
            const fileResult = await apiRequest('/api/files', 'GET', null);
            console.log(`   Status: ${fileResult.status}`);
            
            if (fileResult.status === 401) {
                // Retry with proper Authorization header
                console.log('   Retrying with Authorization header...');
                
                const options = {
                    hostname: 'localhost',
                    port: 5000,
                    path: '/api/files',
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                };
                
                const req = http.request(options, (res) => {
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => {
                        try {
                            const json = JSON.parse(body);
                            console.log(`   Status: ${res.statusCode}`);
                            console.log(`   Files count: ${Array.isArray(json) ? json.length : 'unknown'}`);
                            if (Array.isArray(json) && json.length > 0) {
                                console.log('\n   📋 File List:');
                                json.slice(0, 5).forEach(f => {
                                    console.log(`      - ${f.filename || f.original_name} (${f.zona_kode}/${f.toko_kode}/${f.category})`);
                                });
                                if (json.length > 5) console.log(`      ... and ${json.length - 5} more files`);
                            } else {
                                console.log('   No files found');
                            }
                        } catch (e) {
                            console.log('   Response:', body.substring(0, 100));
                        }
                    });
                });
                req.on('error', reject);
                req.end();
            } else {
                console.log('   Files:', fileResult.data);
            }
            
        } else {
            console.log('   ❌ Login failed!');
        }
        
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
    
    console.log('\n✅ Done');
}

main();
