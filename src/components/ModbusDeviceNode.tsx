'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Cpu, Radio } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';

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
    return { bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-400 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500 dark:bg-emerald-400' };
  }
  if (responseTime < 300) {
    return { bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-400 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500 dark:bg-amber-400' };
  }
  return { bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-400 dark:border-red-700', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500 dark:bg-red-400' };
}

function ModbusDeviceNode({ data }: NodeProps<ModbusDeviceNodeData>) {
  const { responseTime, label, isMaster, address } = data;
  const { getDeviceDisplayName } = useProject();
  
  const displayLabel = isMaster ? label : (address ? getDeviceDisplayName(address) : label);
  const colors = isMaster
    ? { bg: 'bg-slate-100 dark:bg-slate-700', border: 'border-slate-400 dark:border-slate-500', text: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-500 dark:bg-slate-400' }
    : getSignalColor(responseTime);

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 shadow-md ${colors.bg} ${colors.border} min-w-[140px] transition-shadow hover:shadow-lg`}
    >
      {/* Input handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-600"
      />

      <div className="flex items-center gap-2 mb-1">
        {isMaster ? (
          <Radio className={`w-4 h-4 ${colors.text}`} />
        ) : (
          <Cpu className={`w-4 h-4 ${colors.text}`} />
        )}
        <span className={`text-sm font-bold ${colors.text}`}>{displayLabel}</span>
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
        className="!w-3 !h-3 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-600"
      />
    </div>
  );
}

export default memo(ModbusDeviceNode);
