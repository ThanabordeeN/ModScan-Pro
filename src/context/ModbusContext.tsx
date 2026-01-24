'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { ModbusDevice } from '@/types/modbus';

interface ConnectionSettings {
  type: 'serial' | 'tcp';
  port: string;
  baudRate: number;
  parity: 'none' | 'even' | 'odd';
  stopBits: 1 | 2;
  dataBits: 7 | 8;
  tcpIp?: string;
  tcpPort?: number;
}

interface ModbusContextType {
  // Connection settings
  connection: ConnectionSettings;
  setConnection: (settings: ConnectionSettings) => void;
  
  // Scanned devices
  scannedDevices: ModbusDevice[];
  setScannedDevices: (devices: ModbusDevice[]) => void;
  
  // Check if connected
  isConnectionReady: boolean;
}

const defaultConnection: ConnectionSettings = {
  type: 'serial',
  port: '',
  baudRate: 9600,
  parity: 'none',
  stopBits: 1,
  dataBits: 8,
  tcpIp: '192.168.1.10',
  tcpPort: 502,
};

const ModbusContext = createContext<ModbusContextType | undefined>(undefined);

export function ModbusProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<ConnectionSettings>(defaultConnection);
  const [scannedDevices, setScannedDevices] = useState<ModbusDevice[]>([]);

  const isConnectionReady = connection.type === 'serial' ? !!connection.port : (!!connection.tcpIp && !!connection.tcpPort);

  return (
    <ModbusContext.Provider value={{
      connection,
      setConnection,
      scannedDevices,
      setScannedDevices,
      isConnectionReady,
    }}>
      {children}
    </ModbusContext.Provider>
  );
}

export function useModbus() {
  const context = useContext(ModbusContext);
  if (context === undefined) {
    throw new Error('useModbus must be used within a ModbusProvider');
  }
  return context;
}
