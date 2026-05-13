/**
 * Shared Modbus utility functions used by modbus.js and dashboard-poller.js
 */

async function connectClient(client, config) {
  if (config.type === 'tcp') {
    if (!config.tcpIp || !config.tcpPort) {
      throw new Error('TCP IP and Port are required');
    }
    await client.connectTCP(config.tcpIp, { port: config.tcpPort, family: 4 });
  } else {
    if (!config.port) {
      throw new Error('Serial Port is required');
    }
    await client.connectRTUBuffered(config.port, {
      baudRate: config.baudRate || 9600,
      dataBits: config.dataBits || 8,
      stopBits: config.stopBits || 1,
      parity: config.parity || 'none',
    });
  }
}

function getErrorMessage(error) {
  const msg = error.message || '';
  if (msg.includes('Timed out')) {
    return 'Connection Timed Out. Check if device is powered on and parameters (Baud Rate, ID) are correct.';
  }
  if (msg.includes('Port Not Open')) {
    return 'Port Not Open. Please check if the Serial Port is available and not used by another program.';
  }
  if (msg.includes('ECONNREFUSED')) {
    return 'Connection Refused. Check if the Modbus TCP Server ip/port is correct and reachable.';
  }
  if (msg.includes('EHOSTUNREACH')) {
    return 'Host Unreachable. Check if the device IP address is correct and on the same network subnet.';
  }
  if (msg.includes('CRC error')) {
    return 'CRC Error. Communication noise or incorrect Baud Rate/Parity settings.';
  }
  return msg || 'Unknown Error';
}

/**
 * Extract Modbus exception metadata from an error thrown by modbus-serial.
 * modbus-serial throws errors with a `modbusCode` property for exception responses.
 *
 * @param {Error} error
 * @param {number} [_originalFunctionCode]
 * @returns {{ isException: boolean, exceptionCode?: number, exceptionName?: string }}
 */
function extractExceptionInfo(error, _originalFunctionCode) {
  if (!error) return { isException: false };

  // modbus-serial structured: error.modbusCode contains the exception code
  if (typeof error.modbusCode === 'number') {
    const code = error.modbusCode;
    const names = {
      1: 'Illegal Function',
      2: 'Illegal Data Address',
      3: 'Illegal Data Value',
      4: 'Slave Device Failure',
      5: 'Acknowledge',
      6: 'Slave Device Busy',
      8: 'Memory Parity Error',
      10: 'Gateway Path Unavailable',
      11: 'Gateway Target Device Failed to Respond',
    };
    return {
      isException: true,
      exceptionCode: code,
      exceptionName: names[code] || `Unknown Exception 0x${code.toString(16).toUpperCase()}`,
    };
  }

  // Parse from message string: "Modbus exception X"
  const msg = error.message || '';
  const match = msg.match(/Modbus exception (\d+)/i);
  if (match) {
    const code = parseInt(match[1], 10);
    return {
      isException: true,
      exceptionCode: code,
      exceptionName: `Exception 0x${code.toString(16).toUpperCase()}`,
    };
  }

  return { isException: false };
}

module.exports = { connectClient, getErrorMessage, extractExceptionInfo };
