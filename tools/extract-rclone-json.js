#!/usr/bin/env node

/**
 * Extract rclone config section and convert to JSON
 * Usage: node tools/extract-rclone-json.js [section_name] [config_path]
 * 
 * Example:
 *   node tools/extract-rclone-json.js gdrive
 *   node tools/extract-rclone-json.js gdrive ~/.config/rclone/rclone.conf
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const sectionName = process.argv[2] || 'gdrive';
let configPath = process.argv[3];

// Default config path
if (!configPath) {
    const homeDir = os.homedir();
    configPath = path.join(homeDir, '.config', 'rclone', 'rclone.conf');
}

console.log(`\n📄 Extracting rclone section: [${sectionName}]`);
console.log(`📍 Config file: ${configPath}\n`);

// Read config file
try {
    const content = fs.readFileSync(configPath, 'utf8');
    
    // Find section
    const sectionRegex = new RegExp(`^\\[${sectionName}\\]\\s*$([\\s\\S]*?)(?=^\\[|$)`, 'm');
    const match = content.match(sectionRegex);
    
    if (!match) {
        console.error(`❌ Section [${sectionName}] not found in ${configPath}`);
        process.exit(1);
    }
    
    // Parse config section into object
    const configObj = {};
    const lines = match[1].trim().split('\n');
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) return;
        
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
            configObj[key.trim()] = valueParts.join('=').trim();
        }
    });
    
    // Convert to JSON
    const json = JSON.stringify(configObj, null, 2);
    
    console.log('✅ Extracted configuration:\n');
    console.log(json);
    
    console.log('\n\n📋 JSON for Railway GDRIVE_CONFIG_JSON variable:\n');
    console.log(JSON.stringify(configObj));
    
    console.log('\n\n💡 Steps:');
    console.log('1. Copy the JSON above (from "📋 JSON for Railway..." section)');
    console.log('2. Go to Railway Dashboard → Variables');
    console.log('3. Add/Update variable: GDRIVE_CONFIG_JSON');
    console.log('4. Paste the JSON value');
    console.log('5. Trigger redeploy');
    console.log('6. Test upload again\n');
    
} catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
}
