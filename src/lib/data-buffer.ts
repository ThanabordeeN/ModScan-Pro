/**
 * Data Buffer & CSV Export utilities for the Modbus Data Logger.
 * 
 * Stores read data in an in-memory buffer and provides CSV export functionality.
 */

export interface DataBufferEntry {
  timestamp: number;
  timeStr: string;
  slaveId: number;
  address: number;
  value: number;
  functionCode: number;
  remark?: string;
}

/**
 * Converts an array of DataBufferEntry objects to a CSV string.
 */
export function bufferToCSV(entries: DataBufferEntry[]): string {
  const header = 'Timestamp,Time,Slave ID,Address,Value,Function Code,Remark';
  const rows = entries.map(entry => {
    const remark = entry.remark ? `"${entry.remark.replace(/"/g, '""')}"` : '';
    return `${entry.timestamp},${entry.timeStr},${entry.slaveId},${entry.address},${entry.value},${entry.functionCode},${remark}`;
  });
  return [header, ...rows].join('\n');
}

/**
 * Triggers a browser file download with the given content and filename.
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
