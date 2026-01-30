#!/usr/bin/env node
/**
 * Simple Modbus TCP Simulator/Server
 * Run: node scripts/modbus-simulator.js [PORT]
 * Default port: 502
 */

const ModbusRTU = require('modbus-serial');

const port = parseInt(process.argv[2] || '1502', 10); // Use 1502 as non-root port

// Create a vector of holding and coil registers
const coils = new Array(1000).fill(false);
const discreteInputs = new Array(1000).fill(false);
const holdingRegisters = new Array(1000).fill(0);
const inputRegisters = new Array(1000).fill(0);

// Initialize with some test data
holdingRegisters[0] = 100;
holdingRegisters[1] = 200;
holdingRegisters[2] = 300;
holdingRegisters[3] = 1000;
holdingRegisters[4] = 2000;

inputRegisters[0] = 123;
inputRegisters[1] = 456;
inputRegisters[2] = 789;

coils[0] = true;
coils[1] = false;
coils[2] = true;

discreteInputs[0] = true;
discreteInputs[1] = true;
discreteInputs[2] = false;

// Initial Unit ID
let currentUnitID = 1;

// Helper to simulate "no response" (timeout)
const ignoreRequest = async (unitID) => {
    // Wait 2 seconds (longer than typical scan timeout of 500ms)
    // yielding a timeout on the client side.
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Then throw or return null to ensure no valid response is sent if the server implementation waits
    throw new Error('Ignore'); 
};

// Vector for callback functions
const vector = {
  getInputRegister: async (addr, unitID) => {
    if (unitID !== currentUnitID && unitID !== 0) { 
       await ignoreRequest(unitID);
       return 0;
    }
    console.log(`  [FC04] Read Input Register: addr=${addr}, unitID=${unitID} (MyID: ${currentUnitID})`);
    return inputRegisters[addr] || 0;
  },
  
  getHoldingRegister: async (addr, unitID) => {
    if (unitID !== currentUnitID && unitID !== 0) {
       await ignoreRequest(unitID);
       return 0;
    }
    console.log(`  [FC03] Read Holding Register: addr=${addr}, unitID=${unitID} (MyID: ${currentUnitID})`);
    return holdingRegisters[addr] || 0;
  },
  
  getCoil: async (addr, unitID) => {
    if (unitID !== currentUnitID && unitID !== 0) {
       await ignoreRequest(unitID);
       return false;
    }
    console.log(`  [FC01] Read Coil: addr=${addr}, unitID=${unitID} (MyID: ${currentUnitID})`);
    return coils[addr] || false;
  },
  
  getDiscreteInput: async (addr, unitID) => {
    if (unitID !== currentUnitID && unitID !== 0) {
       await ignoreRequest(unitID);
       return false;
    }
    console.log(`  [FC02] Read Discrete Input: addr=${addr}, unitID=${unitID} (MyID: ${currentUnitID})`);
    return discreteInputs[addr] || false;
  },
  
  setRegister: async (addr, value, unitID) => {
    if (unitID !== currentUnitID && unitID !== 0) {
       await ignoreRequest(unitID);
       return;
    }
    
    console.log(`  [FC06/16] Write Register: addr=${addr}, value=${value}, unitID=${unitID} (MyID: ${currentUnitID})`);
    
    // Special Logic: Changing Device ID via Register 0
    if (addr === 0) {
        console.log(`  \x1b[33m[CONFIG CHANGE] Updating Unit ID from ${currentUnitID} to ${value}...\x1b[0m`);
        currentUnitID = value;
    }
    
    holdingRegisters[addr] = value;
  },
  
  setCoil: async (addr, value, unitID) => {
    if (unitID !== currentUnitID && unitID !== 0) {
       await ignoreRequest(unitID);
       return;
    }
    console.log(`  [FC05/15] Write Coil: addr=${addr}, value=${value}, unitID=${unitID} (MyID: ${currentUnitID})`);
    coils[addr] = value;
  },
};

// Create server
// Note: We remove 'unitID' param here to let the vector handle all requests (Promiscuous Mode at TCP level)
// This allows us to receive requests for ANY unitID and decide inside the vector whether to respond.
const serverTCP = new ModbusRTU.ServerTCP(vector, {
  host: '0.0.0.0',
  port: port,
  debug: true,
  // unitID: 1, // REMOVED to allow vector to see all UnitIDs
});

console.log(`\n╔════════════════════════════════════════════╗`);
console.log(`║     Modbus TCP Simulator Started           ║`);
console.log(`╠════════════════════════════════════════════╣`);
console.log(`║  IP: 0.0.0.0 (all interfaces)              ║`);
console.log(`║  Port: ${port.toString().padEnd(36)}║`);
console.log(`║  Initial Unit ID: 1                        ║`);
console.log(`╠════════════════════════════════════════════╣`);
console.log(`║  Test with:                                ║`);
console.log(`║  node scripts/test-tcp.js 127.0.0.1 ${port.toString().padEnd(5)} 1  ║`);
console.log(`╚════════════════════════════════════════════╝`);
console.log(`\nInitial Data:`);
console.log(`  Holding Registers[0-4]: [${holdingRegisters.slice(0,5).join(', ')}]`);
console.log(`  Input Registers[0-2]: [${inputRegisters.slice(0,3).join(', ')}]`);
console.log(`  Coils[0-2]: [${coils.slice(0,3).map(v => v ? 'ON' : 'OFF').join(', ')}]`);
console.log(`\nWaiting for connections... (Ctrl+C to stop)\n`);

serverTCP.on('socketError', (err) => {
  console.error('Socket Error:', err.message);
});

// Keep process alive
process.on('SIGINT', () => {
  console.log('\nShutting down simulator...');
  serverTCP.close(() => {
    console.log('Simulator stopped.');
    process.exit(0);
  });
});
