#!/usr/bin/env node

/**
 * Get JWT Token for Testing
 * This creates a test user token to access protected endpoints
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET not found in .env');
    process.exit(1);
}

// Create a test token (super_admin role)
const payload = {
    userId: 'test-user-001',
    email: 'test@example.com',
    role: 'super_admin', // Can access all features
    zona_id: 1,
    name: 'Test User',
    permissions: ['upload_single', 'upload_batch', 'soft_delete']
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║            JWT Token for Testing                           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('Token:');
console.log(token);

console.log('\n📝 Usage:\n');
console.log('1. Set as header:');
console.log('   Authorization: Bearer ' + token.substring(0, 30) + '...');

console.log('\n2. Or set as query param:');
console.log('   http://localhost:5000/api/files?token=' + token.substring(0, 30) + '...');

console.log('\n3. Or use curl:');
console.log('   curl -H "Authorization: Bearer ' + token.substring(0, 20) + '..." http://localhost:5000/api/files');

console.log('\n4. Or save to file:');
console.log('   echo "' + token + '" > token.txt');

console.log('\n⏱️  Token expires in: 24 hours\n');

console.log('User Info:');
console.log('  Role: ' + payload.role);
console.log('  Email: ' + payload.email);
console.log('  Zona ID: ' + payload.zona_id + '\n');
