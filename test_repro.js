
const modbus = require('./electron/ipc/modbus.js');

async function runTest() {
  console.log("--- Testing Invalid Range (Start: 1, End: 1000000) ---");
  try {
    const result = await modbus.ModbusService.scan({
      startAddress: 1,
      endAddress: 1000000,
      port: 'COM1', // Dummy port
      timeout: 10 // Short timeout to fail faster
    });

    if (result.success === false) {
        console.log("Result Error:", result.error);
    } else {
        console.log("Result Success (Unexpected):", result);
    }
  } catch (e) {
    console.log("Caught Error:", e.message);
  }
}

runTest();
