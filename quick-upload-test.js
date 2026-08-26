const fs = require('fs');
const path = require('path');
const https = require('https');

// Create a simple test PDF
const pdfContent = `%PDF-1.1
%âãÏÓ
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
50 750 Td
(Web Upload Test) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
308
%%EOF`;

const testFile = 'NON Balaraja 3.000.000 26 Aug.pdf';
const testFilePath = path.join(__dirname, testFile);

// Write test PDF
fs.writeFileSync(testFilePath, pdfContent);
console.log(`[Test] Created test PDF: ${testFile}`);

// Step 1: Login
async function login() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            email: 'arsip@anka.id',
            password: 'Sukarman123!'
        });

        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let respData = '';
            res.on('data', chunk => respData += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Login failed: ${res.statusCode} - ${respData}`));
                } else {
                    try {
                        const json = JSON.parse(respData);
                        resolve(json.token);
                    } catch (e) {
                        reject(new Error(`Failed to parse login response: ${e.message}`));
                    }
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    }).catch(() => {
        // HTTPS failed, try HTTP
        return new Promise((resolve, reject) => {
            const http = require('http');
            const data = JSON.stringify({
                email: 'arsip@anka.id',
                password: 'Sukarman123!'
            });

            const options = {
                hostname: 'localhost',
                port: 5000,
                path: '/api/auth/login',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req = http.request(options, (res) => {
                let respData = '';
                res.on('data', chunk => respData += chunk);
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`Login failed: ${res.statusCode} - ${respData}`));
                    } else {
                        try {
                            const json = JSON.parse(respData);
                            resolve(json.token);
                        } catch (e) {
                            reject(new Error(`Failed to parse login response: ${e.message}`));
                        }
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    });
}

async function main() {
    try {
        console.log('[Test] Logging in...');
        const token = await login();
        console.log(`[Test] Login successful, token: ${token.substring(0, 20)}...`);
        console.log(`[Test] Check server logs for file upload progress`);
        console.log(`[Test] File would be uploaded to: /arsip/zona-01/toko-balaraja/INVOICE/`);
        
        // Cleanup
        fs.unlinkSync(testFilePath);
        console.log(`[Test] Cleaned up test file`);
    } catch (err) {
        console.error('[Test] Error:', err.message);
        if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    }
}

main();
