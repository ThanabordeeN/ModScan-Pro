'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Cpu, Radio } from 'lucide-react';

export interface ModbusDeviceNodeData {
  address: number;
  responseTime: number;
  label: string;
  isMaster?: boolean;
}

/**
 * Maps response time (ms) to a heatmap color.
 * - Green: Excellent signal (< 100ms)
 * - Yellow/Orange: Medium signal (100–300ms)
 * - Red: Poor signal (> 300ms)
 */
export function getSignalColor(responseTime: number): { bg: string; border: string; text: string; dot: string } {
  if (responseTime < 100) {
    return { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  }
  if (responseTime < 300) {
    return { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', dot: 'bg-amber-500' };
  }
  return { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700', dot: 'bg-red-500' };
}

function ModbusDeviceNode({ data }: NodeProps<ModbusDeviceNodeData>) {
  const { responseTime, label, isMaster } = data;
  const colors = isMaster
    ? { bg: 'bg-slate-100', border: 'border-slate-400', text: 'text-slate-700', dot: 'bg-slate-500' }
    : getSignalColor(responseTime);

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 shadow-md ${colors.bg} ${colors.border} min-w-[140px] transition-shadow hover:shadow-lg`}
    >
      {/* Input handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white"
      />

      <div className="flex items-center gap-2 mb-1">
        {isMaster ? (
          <Radio className={`w-4 h-4 ${colors.text}`} />
        ) : (
          <Cpu className={`w-4 h-4 ${colors.text}`} />
        )}
        <span className={`text-sm font-bold ${colors.text}`}>{label}</span>
      </div>

      {!isMaster && (
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-block w-2 h-2 rounded-full ${colors.dot}`} />
          <span className={`text-xs ${colors.text}`} aria-label={`Response time: ${responseTime} milliseconds`}>
            {responseTime}ms
          </span>
        </div>
      )}

      {/* Output handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white"
      />
    </div>
  );
}

export default memo(ModbusDeviceNode);
