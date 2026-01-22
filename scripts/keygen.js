const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const privateKeyPath = path.resolve(__dirname, 'private_key.pem');

if (!fs.existsSync(privateKeyPath)) {
  console.error('Error: private_key.pem not found. Run generate-keys.js first.');
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

const machineId = process.argv[2];

if (!machineId) {
  console.log('Usage: node scripts/keygen.js <MACHINE_ID>');
  console.log('Example: node scripts/keygen.js 595f44f4-78d2-4d76-8e43-8515e0a0d631');
  process.exit(1);
}

// Sign the machineId
const sign = crypto.createSign('SHA256');
sign.update(machineId);
sign.end();

const signature = sign.sign(privateKey, 'base64');

console.log('\n--- LICENSE KEY ---');
console.log(signature);
console.log('-------------------\n');
