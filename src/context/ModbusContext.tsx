'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { ModbusDevice } from '@/types/modbus';

interface ConnectionSettings {
  port: string;
  baudRate: number;
  parity: 'none' | 'even' | 'odd';
  stopBits: 1 | 2;
  dataBits: 7 | 8;
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
  port: '',
  baudRate: 9600,
  parity: 'none',
  stopBits: 1,
  dataBits: 8,
};

const ModbusContext = createContext<ModbusContextType | undefined>(undefined);

export function ModbusProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<ConnectionSettings>(defaultConnection);
  const [scannedDevices, setScannedDevices] = useState<ModbusDevice[]>([]);

  const isConnectionReady = !!connection.port;

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
