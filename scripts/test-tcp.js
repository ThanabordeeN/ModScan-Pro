/**
 * TCP Modbus Test Script
 * Run: node scripts/test-tcp.js <IP> <PORT> <SLAVE_ID>
 * Example: node scripts/test-tcp.js 192.168.1.100 502 1
 */

const ModbusRTU = require('modbus-serial');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node scripts/test-tcp.js <IP> <PORT> [SLAVE_ID]');
  console.log('Example: node scripts/test-tcp.js 192.168.1.100 502 1');
  process.exit(1);
}

const ip = args[0];
const port = parseInt(args[1], 10);
const slaveId = parseInt(args[2] || '1', 10);

async function testTcpConnection() {
  const client = new ModbusRTU();
  
  console.log(`\n🔌 Testing Modbus TCP Connection`);
  console.log(`   IP: ${ip}`);
  console.log(`   Port: ${port}`);
  console.log(`   Slave ID: ${slaveId}`);
  console.log('─'.repeat(40));
  
  try {
    // Connect to TCP
    console.log('\n[1] Connecting to Modbus TCP...');
    await client.connectTCP(ip, { port });
    console.log('    ✅ Connected successfully!');
    
    client.setID(slaveId);
    client.setTimeout(3000);
    
    // Test 1: Read Holding Registers (FC03)
    console.log('\n[2] Reading Holding Registers (FC03, Address 0, Qty 10)...');
    try {
      const holdingRegs = await client.readHoldingRegisters(0, 10);
      console.log('    ✅ Success!');
      console.log('    Data:', holdingRegs.data);
    } catch (err) {
      console.log('    ❌ Failed:', err.message);
    }
    
    // Test 2: Read Input Registers (FC04)
    console.log('\n[3] Reading Input Registers (FC04, Address 0, Qty 10)...');
    try {
      const inputRegs = await client.readInputRegisters(0, 10);
      console.log('    ✅ Success!');
      console.log('    Data:', inputRegs.data);
    } catch (err) {
      console.log('    ❌ Failed:', err.message);
    }
    
    // Test 3: Read Coils (FC01)
    console.log('\n[4] Reading Coils (FC01, Address 0, Qty 8)...');
    try {
      const coils = await client.readCoils(0, 8);
      console.log('    ✅ Success!');
      console.log('    Data:', coils.data);
    } catch (err) {
      console.log('    ❌ Failed:', err.message);
    }
    
    await client.close(() => {});
    console.log('\n[5] Connection closed');
    console.log('\n✅ TCP Modbus test completed!\n');
    
  } catch (error) {
    console.log('\n❌ Connection failed:', error.message);
    console.log('\nPossible causes:');
    console.log('  - Device is not reachable at the specified IP');
    console.log('  - Wrong port number (default Modbus TCP port is 502)');
    console.log('  - Firewall blocking the connection');
    console.log('  - Device not responding\n');
    process.exit(1);
  }
}

testTcpConnection();
