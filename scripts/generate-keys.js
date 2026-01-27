#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const privateKeyPath = path.resolve(__dirname, 'private_key.pem');
const publicKeyPath = path.resolve(__dirname, 'public_key.pem');
// Also save public key to src/lib for the app to use
const appPublicKeyPath = path.resolve(__dirname, '../src/lib/public_key.pem');

console.log('Generating 2048-bit RSA key pair...');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'pkcs1',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs1',
    format: 'pem'
  }
});

fs.writeFileSync(privateKeyPath, privateKey);
console.log(`Private key saved to: ${privateKeyPath}`);

fs.writeFileSync(publicKeyPath, publicKey);
console.log(`Public key saved to: ${publicKeyPath}`);

// Ensure src/lib exists
const libDir = path.dirname(appPublicKeyPath);
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}

fs.writeFileSync(appPublicKeyPath, publicKey);
console.log(`Public key copied to app: ${appPublicKeyPath}`);

console.log('\nIMPORTANT: Keep private_key.pem SECRET! Do not commit it to git if this is a public repo.');
