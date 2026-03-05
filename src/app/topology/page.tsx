'use client';

import { useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, Search, Info } from 'lucide-react';
import Link from 'next/link';

import { useModbus } from '@/context/ModbusContext';
import { useLanguage } from '@/context/LanguageContext';
import ModbusDeviceNode from '@/components/ModbusDeviceNode';
import type { ModbusDevice } from '@/types/modbus';

const nodeTypes: NodeTypes = {
  modbusDevice: ModbusDeviceNode,
};

/**
 * Build React Flow nodes and edges from scanned Modbus devices.
 * Places a Master node on the left with device nodes laid out in a grid to the right.
 */
function buildTopology(devices: ModbusDevice[], masterLabel: string) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Master node
  nodes.push({
    id: 'master',
    type: 'modbusDevice',
    position: { x: 50, y: 200 },
    data: { address: 0, responseTime: 0, label: masterLabel, isMaster: true },
    draggable: true,
  });

  // Device nodes arranged in a grid (up to 4 columns)
  const cols = 4;
  const xStart = 300;
  const yStart = 50;
  const xGap = 200;
  const yGap = 120;

  devices.forEach((device, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const nodeId = `device-${device.address}`;

    nodes.push({
      id: nodeId,
      type: 'modbusDevice',
      position: { x: xStart + col * xGap, y: yStart + row * yGap },
      data: {
        address: device.address,
        responseTime: device.responseTime,
        label: `Slave ${device.address}`,
      },
      draggable: true,
    });

    edges.push({
      id: `edge-master-${device.address}`,
      source: 'master',
      target: nodeId,
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
    });
  });

  return { nodes, edges };
}

export default function TopologyPage() {
  const { scannedDevices } = useModbus();
  const { t } = useLanguage();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildTopology(scannedDevices, t('topo_master')),
    [scannedDevices, t]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes when scannedDevices change
  const syncKey = useMemo(
    () => scannedDevices.map((d) => d.address).join(','),
    [scannedDevices]
  );

  // Reset nodes/edges when devices change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  const hasDevices = scannedDevices.length > 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center">
          <Network className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t('topo_title')}</h2>
          <p className="text-sm text-slate-500">{t('topo_subtitle')}</p>
        </div>
      </div>

      {/* Legend */}
      {hasDevices && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-semibold text-slate-700">{t('topo_legend')}:</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-600">&lt; 100ms — {t('topo_legend_good')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-slate-600">100–300ms — {t('topo_legend_medium')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-slate-600">&gt; 300ms — {t('topo_legend_poor')}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <Info className="w-3 h-3" />
            {t('topo_drag_hint')}
          </p>
        </div>
      )}

      {/* Topology canvas or empty state */}
      {hasDevices ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ height: 520 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: false }}
          >
            <Background gap={20} size={1} color="#e2e8f0" />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(node) => {
                if (node.data?.isMaster) return '#94a3b8';
                const rt = node.data?.responseTime ?? 0;
                if (rt < 100) return '#10b981';
                if (rt < 300) return '#f59e0b';
                return '#ef4444';
              }}
              maskColor="rgba(241, 245, 249, 0.7)"
              style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}
            />
          </ReactFlow>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">{t('topo_no_devices')}</h3>
          <p className="text-sm text-slate-500 mb-4">{t('topo_scan_hint')}</p>
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Search className="w-4 h-4" />
            {t('topo_scan_link')}
          </Link>
        </div>
      )}
    </div>
  );
}
