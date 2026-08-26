const http = require('http');

// Simple test to check what /api/toko returns
async function testTokoAPI() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/toko?zona_id=1',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer test'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('Status:', res.statusCode);
                console.log('Response:', data);
                try {
                    const parsed = JSON.parse(data);
                    console.log('Parsed:', JSON.stringify(parsed, null, 2));
                } catch (e) {
                    console.log('Parse error:', e.message);
                }
                resolve();
            });
        });

        req.on('error', (err) => {
            console.error('Request error:', err);
            reject(err);
        });

        req.end();
    });
}

console.log('[Test] Testing /api/toko endpoint...');
testTokoAPI().catch(console.error);
