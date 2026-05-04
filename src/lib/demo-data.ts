import type { ModbusDevice } from "@/types/modbus";

export const DEMO_DEVICES: ModbusDevice[] = [
  { address: 1, responseTime: 18, holdingRegisters: [230, 501, 1200, 60] },
  { address: 2, responseTime: 24, holdingRegisters: [118, 342, 850, 1] },
  { address: 5, responseTime: 31, holdingRegisters: [400, 125, 240, 0] },
  { address: 8, responseTime: 27, holdingRegisters: [75, 220, 16, 95] },
  { address: 12, responseTime: 36, holdingRegisters: [101, 202, 303, 404] },
];

export function buildDemoDevice(address: number): ModbusDevice {
  return {
    address,
    responseTime: 12 + Math.floor(Math.random() * 68),
    holdingRegisters: Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 1000),
    ),
  };
}

export function buildRandomDemoScan(
  startAddr: number,
  endAddr: number,
): ModbusDevice[] {
  const min = Math.min(startAddr, endAddr);
  const max = Math.max(startAddr, endAddr);
  const addresses: number[] = [];

  for (let address = min; address <= max; address++) {
    const rangeSize = max - min + 1;
    const discoveryRate = rangeSize <= 10 ? 0.42 : 0.18;
    if (Math.random() < discoveryRate) addresses.push(address);
  }

  if (addresses.length === 0 && max >= min) {
    addresses.push(min + Math.floor(Math.random() * (max - min + 1)));
  }

  return addresses
    .slice(0, 24)
    .sort((a, b) => a - b)
    .map(buildDemoDevice);
}

export function buildDemoReadValues(
  slaveAddress: number,
  registerAddress: number,
  quantity: number,
  functionCode: number,
): number[] {
  const tick = Math.floor(Date.now() / 1000);
  return Array.from({ length: quantity }, (_, idx) => {
    const seed = slaveAddress * 97 + registerAddress + idx * 13 + tick;
    return functionCode === 1 || functionCode === 2 ? seed % 2 : seed % 1000;
  });
}
