export type Severity = 'info' | 'warning' | 'error' | 'critical';

export type ErrorModule =
  | 'connection'
  | 'scan'
  | 'read'
  | 'write'
  | 'polling'
  | 'topology'
  | 'project'
  | 'tunnel';

export interface OperationalErrorLog {
  id: string;
  timestamp: string;
  severity: Severity;
  module: ErrorModule;
  action: string;
  message: string;
  userMessage: string;
  rawError?: string;
  context?: {
    connectionType?: 'rtu' | 'tcp';
    port?: string;
    tcpIp?: string;
    tcpPort?: number;
    baudRate?: number;
    parity?: string;
    slaveId?: number;
    functionCode?: number;
    startAddress?: number;
    quantity?: number;
  };
  suggestion?: string;
}

export type ActionType =
  | 'scan_start'
  | 'scan_cancel'
  | 'read_start'
  | 'read_stop'
  | 'write_attempt'
  | 'write_success'
  | 'write_failed'
  | 'connect'
  | 'disconnect'
  | 'project_saved'
  | 'project_loaded'
  | 'tunnel_started'
  | 'tunnel_stopped'
  | 'change_address';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ActionLog {
  id: string;
  timestamp: string;
  action: ActionType;
  module: ErrorModule;
  description: string;
  riskLevel: RiskLevel;
  context?: Record<string, unknown>;
  result?: 'success' | 'failed' | 'cancelled';
}

export type FeedbackCategory =
  | 'bug'
  | 'device_not_found'
  | 'read_error'
  | 'write_error'
  | 'ui_issue'
  | 'feature_request'
  | 'other';

export interface FeedbackPayload {
  category: FeedbackCategory;
  userMessage: string;
  includeDiagnostics: boolean;
}

export interface AppInfo {
  appVersion: string;
  os: string;
  electronVersion: string;
  nodeVersion: string;
  platform: string;
}
