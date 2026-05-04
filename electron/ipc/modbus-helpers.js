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

module.exports = { connectClient, getErrorMessage };
