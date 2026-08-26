const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

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
(Test Document) Tj
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

const testFile = 'NON Balaraja 1.500.000 26 Aug.pdf';
const testFilePath = path.join(__dirname, testFile);

// Write test PDF
fs.writeFileSync(testFilePath, pdfContent);
console.log(`[Test] Created test PDF: ${testFile}`);

// Get JWT token first
async function getToken() {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'arsip@anka.id',
            password: 'Sukarman123!'
        })
    });
    
    if (!loginRes.ok) {
        const error = await loginRes.text();
        throw new Error(`Login failed: ${error}`);
    }
    
    const data = await loginRes.json();
    console.log(`[Test] Login successful, token: ${data.token.substring(0, 20)}...`);
    return data.token;
}

// Upload file
async function uploadFile(token) {
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('zona_id', '1');  // Zona 01
    form.append('toko_id', '1');  // Balaraja
    form.append('category', 'INVOICE');
    form.append('tanggal_dokumen', '2026-08-26');
    form.append('total_jual', '1500000');
    form.append('tipe_ppn', 'NON');
    
    const uploadRes = await fetch('http://localhost:5000/api/files/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            ...form.getHeaders()
        },
        body: form
    });
    
    if (!uploadRes.ok) {
        const error = await uploadRes.text();
        console.error(`[Test] Upload failed: ${uploadRes.status}`);
        console.error(error);
        return null;
    }
    
    const result = await uploadRes.json();
    console.log(`[Test] Upload successful:`, result.file);
    return result.file;
}

async function main() {
    try {
        const token = await getToken();
        const file = await uploadFile(token);
        
        if (file) {
            console.log(`\n[Test] File uploaded successfully`);
            console.log(`[Test] Storage path: ${file.storage_path}`);
            console.log(`[Test] Check Google Drive to verify file was uploaded`);
        }
        
        // Cleanup
        fs.unlinkSync(testFilePath);
        console.log(`\n[Test] Cleaned up test file`);
    } catch (err) {
        console.error('[Test] Error:', err.message);
        fs.unlinkSync(testFilePath);
    }
}

main();
