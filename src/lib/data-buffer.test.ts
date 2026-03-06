import { bufferToCSV, DataBufferEntry } from './data-buffer';

describe('data-buffer', () => {
  describe('bufferToCSV', () => {
    it('should return only the header for an empty buffer', () => {
      const result = bufferToCSV([]);
      expect(result).toBe('Timestamp,Time,Slave ID,Address,Value,Function Code,Remark');
    });

    it('should correctly format a single entry', () => {
      const entries: DataBufferEntry[] = [
        { timestamp: 1700000000000, timeStr: '10:00:00', slaveId: 1, address: 100, value: 42, functionCode: 3, remark: 'Temp' }
      ];
      const result = bufferToCSV(entries);
      const lines = result.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('Timestamp,Time,Slave ID,Address,Value,Function Code,Remark');
      expect(lines[1]).toBe('1700000000000,10:00:00,1,100,42,3,"Temp"');
    });

    it('should handle multiple entries', () => {
      const entries: DataBufferEntry[] = [
        { timestamp: 1700000000000, timeStr: '10:00:00', slaveId: 1, address: 0, value: 100, functionCode: 3 },
        { timestamp: 1700000001000, timeStr: '10:00:01', slaveId: 1, address: 1, value: 200, functionCode: 3 },
        { timestamp: 1700000002000, timeStr: '10:00:02', slaveId: 2, address: 0, value: 300, functionCode: 4 },
      ];
      const result = bufferToCSV(entries);
      const lines = result.split('\n');
      expect(lines).toHaveLength(4);
    });

    it('should handle empty remark as empty string', () => {
      const entries: DataBufferEntry[] = [
        { timestamp: 1700000000000, timeStr: '10:00:00', slaveId: 1, address: 0, value: 50, functionCode: 3 }
      ];
      const result = bufferToCSV(entries);
      const lines = result.split('\n');
      expect(lines[1]).toBe('1700000000000,10:00:00,1,0,50,3,');
    });

    it('should escape double quotes in remarks', () => {
      const entries: DataBufferEntry[] = [
        { timestamp: 1700000000000, timeStr: '10:00:00', slaveId: 1, address: 0, value: 50, functionCode: 3, remark: 'Sensor "A"' }
      ];
      const result = bufferToCSV(entries);
      const lines = result.split('\n');
      expect(lines[1]).toContain('"Sensor ""A"""');
    });

    it('should handle remarks with commas', () => {
      const entries: DataBufferEntry[] = [
        { timestamp: 1700000000000, timeStr: '10:00:00', slaveId: 1, address: 0, value: 50, functionCode: 3, remark: 'Temp, Humidity' }
      ];
      const result = bufferToCSV(entries);
      const lines = result.split('\n');
      expect(lines[1]).toContain('"Temp, Humidity"');
    });
  });
});
