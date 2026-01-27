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

// Vector for callback functions
const vector = {
  getInputRegister: (addr, unitID) => {
    console.log(`  [FC04] Read Input Register: addr=${addr}, unitID=${unitID}`);
    return inputRegisters[addr] || 0;
  },
  
  getHoldingRegister: (addr, unitID) => {
    console.log(`  [FC03] Read Holding Register: addr=${addr}, unitID=${unitID}`);
    return holdingRegisters[addr] || 0;
  },
  
  getCoil: (addr, unitID) => {
    console.log(`  [FC01] Read Coil: addr=${addr}, unitID=${unitID}`);
    return coils[addr] || false;
  },
  
  getDiscreteInput: (addr, unitID) => {
    console.log(`  [FC02] Read Discrete Input: addr=${addr}, unitID=${unitID}`);
    return discreteInputs[addr] || false;
  },
  
  setRegister: (addr, value, unitID) => {
    console.log(`  [FC06/16] Write Register: addr=${addr}, value=${value}, unitID=${unitID}`);
    holdingRegisters[addr] = value;
  },
  
  setCoil: (addr, value, unitID) => {
    console.log(`  [FC05/15] Write Coil: addr=${addr}, value=${value}, unitID=${unitID}`);
    coils[addr] = value;
  },
};

// Create server
const serverTCP = new ModbusRTU.ServerTCP(vector, {
  host: '0.0.0.0',
  port: port,
  debug: true,
  unitID: 1,
});

console.log(`\n╔════════════════════════════════════════════╗`);
console.log(`║     Modbus TCP Simulator Started           ║`);
console.log(`╠════════════════════════════════════════════╣`);
console.log(`║  IP: 0.0.0.0 (all interfaces)              ║`);
console.log(`║  Port: ${port.toString().padEnd(36)}║`);
console.log(`║  Unit ID: 1                                ║`);
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
