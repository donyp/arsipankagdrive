/**
 * Test Script: Upload → Delete → Refresh → Upload → Delete → Refresh Cycle
 * 
 * Tests the bug where second delete doesn't update count from 3/3 to 2/3
 * 
 * Expected flow:
 * 1. Upload invoice_pdf → Count should be 3/3 ✓
 * 2. Delete from GDrive
 * 3. Refresh/sync → Count should be 2/3 ✓
 * 4. Upload invoice_pdf again → Count should be 3/3 ✓
 * 5. Delete from GDrive again
 * 6. Refresh/sync → Count should be 2/3 (BUG: still shows 3/3)
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000';
const TEST_FAKTUR = '835101811020926001'; // Example faktur to test

// Mock auth token (should be obtained from login)
let authToken = null;

async function getAuthToken() {
    try {
        // Try to login with test credentials
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'admin'
        });
        
        authToken = loginResponse.data.token;
        console.log('✅ Got auth token');
        return authToken;
    } catch (err) {
        console.error('❌ Failed to get auth token:', err.message);
        // Use a placeholder for testing
        authToken = 'test-token';
        return authToken;
    }
}

async function uploadInvoicePDF(faktur) {
    try {
        console.log(`\n📤 Uploading invoice PDF for faktur: ${faktur}`);
        
        // Create a test PDF buffer
        const testPdf = Buffer.from('%PDF-1.4\n1 0 obj\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Test PDF) Tj\nET\nendstream\nendobj\nxref\ntrailer\n<<\n/Size 2\n>>\nstartxref\n0\n%%EOF');
        
        const formData = new FormData();
        const blob = new Blob([testPdf], { type: 'application/pdf' });
        formData.append('pdf', blob, `${faktur}.pdf`);
        
        const response = await axios.post(`${BASE_URL}/api/invoice/upload-pdf`, formData, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'multipart/form-data'
            }
        });
        
        console.log(`✅ Upload successful: ${response.data.success ? 'yes' : 'no'}`);
        console.log(`   Message: ${response.data.message}`);
        return response.data;
    } catch (err) {
        console.error(`❌ Upload failed:`, err.response?.data || err.message);
        return null;
    }
}

async function getFileCount(faktur) {
    try {
        console.log(`\n📊 Fetching file count for faktur: ${faktur}`);
        
        const response = await axios.get(`${BASE_URL}/api/invoice/get-file-count/${faktur}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const { uploaded_count, required_count, keterangan } = response.data;
        console.log(`✅ File count: ${uploaded_count}/${required_count} (keterangan: ${keterangan})`);
        return { uploaded_count, required_count, keterangan };
    } catch (err) {
        console.error(`❌ Failed to get file count:`, err.response?.data || err.message);
        return null;
    }
}

async function triggerSync(faktur) {
    try {
        console.log(`\n🔄 Triggering manual sync for faktur: ${faktur}`);
        
        const response = await axios.post(`${BASE_URL}/api/invoice/sync-all-file-counts`, {
            faktur: faktur
        }, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log(`✅ Sync completed`);
        console.log(`   Result: ${JSON.stringify(response.data, null, 2)}`);
        return response.data;
    } catch (err) {
        console.error(`❌ Sync failed:`, err.response?.data || err.message);
        return null;
    }
}

async function printLogs() {
    console.log('\n📋 Recent server logs:');
    // This would require tailing the server logs - for now just a placeholder
    console.log('   (Check server console output above)');
}

async function runTest() {
    console.log('='.repeat(80));
    console.log('TEST: Upload → Delete → Refresh → Upload → Delete → Refresh Cycle');
    console.log('='.repeat(80));
    
    // Step 0: Get auth
    await getAuthToken();
    
    // Step 1: Upload invoice_pdf
    console.log('\n' + '='.repeat(80));
    console.log('STEP 1: Upload invoice PDF (first time)');
    console.log('='.repeat(80));
    await uploadInvoicePDF(TEST_FAKTUR);
    await new Promise(r => setTimeout(r, 2000)); // Wait for background upload
    let count = await getFileCount(TEST_FAKTUR);
    console.log(`Expected: 3/3 | Actual: ${count?.uploaded_count}/${count?.required_count}`);
    
    // Step 2: Delete from GDrive (manual - user should do this)
    console.log('\n' + '='.repeat(80));
    console.log('STEP 2: (Manual) Delete invoice PDF from Google Drive');
    console.log('⏳ Please delete the file manually from Google Drive and then press Enter...');
    console.log('='.repeat(80));
    // Note: In real test, user would delete manually
    
    // Step 3: Refresh/sync
    console.log('\n' + '='.repeat(80));
    console.log('STEP 3: Trigger sync (first delete detection)');
    console.log('='.repeat(80));
    await triggerSync(TEST_FAKTUR);
    await getFileCount(TEST_FAKTUR);
    count = await getFileCount(TEST_FAKTUR);
    console.log(`Expected: 2/3 | Actual: ${count?.uploaded_count}/${count?.required_count}`);
    
    // Step 4: Upload invoice_pdf again
    console.log('\n' + '='.repeat(80));
    console.log('STEP 4: Re-upload invoice PDF (second time)');
    console.log('='.repeat(80));
    await uploadInvoicePDF(TEST_FAKTUR);
    await new Promise(r => setTimeout(r, 2000)); // Wait for background upload
    count = await getFileCount(TEST_FAKTUR);
    console.log(`Expected: 3/3 | Actual: ${count?.uploaded_count}/${count?.required_count}`);
    
    // Step 5: Delete from GDrive again (manual)
    console.log('\n' + '='.repeat(80));
    console.log('STEP 5: (Manual) Delete invoice PDF from Google Drive again');
    console.log('⏳ Please delete the file manually from Google Drive and then press Enter...');
    console.log('='.repeat(80));
    // Note: In real test, user would delete manually
    
    // Step 6: Refresh/sync
    console.log('\n' + '='.repeat(80));
    console.log('STEP 6: Trigger sync (second delete detection) - THIS IS WHERE THE BUG APPEARS');
    console.log('='.repeat(80));
    await triggerSync(TEST_FAKTUR);
    count = await getFileCount(TEST_FAKTUR);
    console.log(`Expected: 2/3 | Actual: ${count?.uploaded_count}/${count?.required_count}`);
    
    if (count?.uploaded_count === 2) {
        console.log('\n✅ TEST PASSED: Count correctly updated on second delete');
    } else {
        console.log('\n❌ TEST FAILED: Count still shows 3/3 after second delete (BUG REPRODUCED)');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('TEST COMPLETE - Check server logs above for detailed flow');
    console.log('='.repeat(80));
}

runTest().catch(console.error);
