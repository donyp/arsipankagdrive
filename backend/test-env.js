#!/usr/bin/env node
/**
 * Environment Variables Verification Script
 * Tests if all required environment variables are loaded correctly
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔧 Environment Variables Test');
console.log('═══════════════════════════════════════════════════════════\n');

// Define required variables by tier
const TIERS = {
  CRITICAL: [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'NODE_ENV'
  ],
  RECOMMENDED: [
    'SESSION_SECRET',
    'ALIST_ADMIN_PASSWORD',
    'PORT',
    'ENABLE_ALIST'
  ],
  OPTIONAL: [
    'FONNTE_TOKEN',
    'LOG_LEVEL',
    'MAX_FILE_SIZE'
  ]
};

let allPassed = true;
let criticalPassed = true;
let recommendedCount = 0;

// Test CRITICAL tier
console.log('📋 CRITICAL Variables (REQUIRED):');
console.log('─'.repeat(60));
TIERS.CRITICAL.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const displayValue = value.length > 40 ? value.substring(0, 37) + '...' : value;
    console.log(`✅ ${varName.padEnd(30)} = ${displayValue}`);
  } else {
    console.log(`❌ ${varName.padEnd(30)} = NOT SET`);
    criticalPassed = false;
    allPassed = false;
  }
});
console.log();

// Test RECOMMENDED tier
console.log('📋 RECOMMENDED Variables (SUGGESTED):');
console.log('─'.repeat(60));
TIERS.RECOMMENDED.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const displayValue = value.length > 40 ? value.substring(0, 37) + '...' : value;
    console.log(`✅ ${varName.padEnd(30)} = ${displayValue}`);
    recommendedCount++;
  } else {
    console.log(`⚠️  ${varName.padEnd(30)} = NOT SET`);
  }
});
console.log();

// Test OPTIONAL tier
console.log('📋 OPTIONAL Variables:');
console.log('─'.repeat(60));
TIERS.OPTIONAL.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const displayValue = value.length > 40 ? value.substring(0, 37) + '...' : value;
    console.log(`✅ ${varName.padEnd(30)} = ${displayValue}`);
  } else {
    console.log(`ℹ️  ${varName.padEnd(30)} = (using default)`);
  }
});
console.log();

// Specific validations
console.log('🔍 Detailed Validations:');
console.log('─'.repeat(60));

// Validate JWT_SECRET length
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret && jwtSecret.length >= 32) {
  console.log(`✅ JWT_SECRET length: ${jwtSecret.length} chars (min 32 required)`);
} else {
  console.log(`❌ JWT_SECRET too short: ${jwtSecret?.length || 0} chars (min 32 required)`);
  allPassed = false;
}

// Validate SUPABASE_URL format
const supabaseUrl = process.env.SUPABASE_URL;
if (supabaseUrl && supabaseUrl.includes('supabase.co')) {
  console.log(`✅ SUPABASE_URL format: Valid (${supabaseUrl.substring(0, 40)}...)`);
} else {
  console.log(`❌ SUPABASE_URL format: Invalid or missing`);
  allPassed = false;
}

// Validate PORT is number
const port = process.env.PORT;
if (port && !isNaN(parseInt(port))) {
  console.log(`✅ PORT is valid: ${port}`);
} else {
  console.log(`⚠️  PORT not set or invalid, using default 5000`);
}

// Validate NODE_ENV
const nodeEnv = process.env.NODE_ENV;
if (['development', 'production', 'test'].includes(nodeEnv)) {
  console.log(`✅ NODE_ENV is valid: ${nodeEnv}`);
} else {
  console.log(`⚠️  NODE_ENV not recognized: ${nodeEnv}`);
}

console.log();

// Summary
console.log('📊 Summary:');
console.log('─'.repeat(60));
const criticalRequiredCount = TIERS.CRITICAL.length;
console.log(`Critical Variables: ${criticalRequiredCount}/required ✅`);
console.log(`Recommended Variables: ${recommendedCount}/${TIERS.RECOMMENDED.length} (${Math.round(recommendedCount/TIERS.RECOMMENDED.length*100)}%)`);

console.log();
console.log('═══════════════════════════════════════════════════════════');

if (criticalPassed && allPassed) {
  console.log('✅ STATUS: ALL CHECKS PASSED - Environment is ready!');
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(0);
} else if (criticalPassed) {
  console.log('⚠️  STATUS: CRITICAL OK - Some recommended variables missing');
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(0);
} else {
  console.log('❌ STATUS: CRITICAL VARIABLES MISSING - Fix before running');
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(1);
}
