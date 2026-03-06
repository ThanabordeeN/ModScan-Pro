'use client';

'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, Search, Info, Activity, Pause, Save, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import * as dagre from 'dagre';

import { useModbus } from '@/context/ModbusContext';
import { useLanguage } from '@/context/LanguageContext';
import ModbusDeviceNode from '@/components/ModbusDeviceNode';
import type { ModbusDevice } from '@/types/modbus';
import { modbusAPI } from '@/lib/electron-api';

const nodeTypes: NodeTypes = {
  modbusDevice: ModbusDeviceNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Dimensions for the modbusDevice node (estimate based on ModbusDeviceNode size)
const nodeWidth = 160;
const nodeHeight = 80;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = { ...node };

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    newNode.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

/**
 * Build React Flow nodes and edges from scanned Modbus devices.
 * Places a Master node on the left with device nodes laid out in a grid to the right.
 */
function buildTopology(devices: ModbusDevice[], masterLabel: string) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: 'master',
    type: 'modbusDevice',
    position: { x: 50, y: 200 },
    data: { address: 0, responseTime: 0, label: masterLabel, isMaster: true },
    draggable: true,
  });

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

function TopologyCanvas() {
  const { scannedDevices, connection, isConnectionReady } = useModbus();
  const { t } = useLanguage();
  const { fitView } = useReactFlow();

  const syncKey = useMemo(
    () => scannedDevices.map((d) => d.address).join(','),
    [scannedDevices]
  );
  
  const masterTxt = t('topo_master');

  const { nodes: standardNodes, edges: standardEdges } = useMemo(
    () => buildTopology(scannedDevices, masterTxt),
    [scannedDevices, masterTxt]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(standardNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(standardEdges);

  // Live Monitor State
  const [isLiveMonitoring, setIsLiveMonitoring] = useState(false);
  const monitoringTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load Saved Layout on Initialize or when device list changes
  useEffect(() => {
    setIsLiveMonitoring(false);
    if (!scannedDevices.length) return;

    try {
      const savedLayoutStr = localStorage.getItem(`topo_save_${syncKey}`);
      if (savedLayoutStr) {
        const { nodes: savedNodes, edges: savedEdges } = JSON.parse(savedLayoutStr);
        setNodes(savedNodes || standardNodes);
        setEdges(savedEdges || standardEdges);
        setTimeout(() => fitView({ padding: 0.3, duration: 800 }), 100);
        return;
      }
    } catch (e) {
      console.error('Failed to parse saved topology', e);
    }
    
    // Fallback standard layout
    setNodes(standardNodes);
    setEdges(standardEdges);
    setTimeout(() => fitView({ padding: 0.3, duration: 800 }), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey, setNodes, setEdges, fitView]); // omitted standardNodes/standardEdges on purpose to avoid deep loops

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } }, eds));
    },
    [setEdges]
  );

  const onAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      'LR'
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);

    setTimeout(() => fitView({ padding: 0.3, duration: 800 }), 50);
  }, [nodes, edges, setNodes, setEdges, fitView]);

  const onSaveLayout = useCallback(() => {
    if (!scannedDevices.length) return;
    try {
      // Strip dynamic state data like responseTime from nodes before saving
      const safeNodesToSave = nodes.map(n => ({
         ...n,
         data: {
             ...n.data,
             responseTime: 0 // clear live ping status
         }
      }));
      localStorage.setItem(`topo_save_${syncKey}`, JSON.stringify({ nodes: safeNodesToSave, edges }));
      alert('Layout saved successfully.');
    } catch (e) {
      console.error('Failed to save Layout', e);
      alert('Failed to save layout.');
    }
  }, [nodes, edges, syncKey, scannedDevices.length]);


  // Live Monitoring Effect
  useEffect(() => {
    if (!isLiveMonitoring || !isConnectionReady) {
      if (monitoringTimerRef.current) clearInterval(monitoringTimerRef.current);
      return;
    }

    const pollDevices = async () => {
      const deviceNodes = nodes.filter(n => !n.data.isMaster);
      if (deviceNodes.length === 0) return;

      const requests: any[] = deviceNodes.map(node => ({
        slaveAddress: node.data.address,
        functionCode: 3, 
        registerAddress: 0,
        quantity: 1
      }));

      const startTime = Date.now();
      try {
        const data = await modbusAPI.readBatch({
          type: connection.type,
          port: connection.port,
          baudRate: connection.baudRate,
          parity: connection.parity,
          stopBits: connection.stopBits,
          dataBits: connection.dataBits,
          tcpIp: connection.tcpIp,
          tcpPort: connection.tcpPort,
          requests,
          timeout: 500, 
        });
        const elapsed = Date.now() - startTime;

        if (!data.error && data.results) {
          setNodes((nds) =>
            nds.map((node) => {
              if (node.data.isMaster) return node;
              const reqIdx = requests.findIndex(req => req.slaveAddress === node.data.address);
              if (reqIdx >= 0) {
                const res = data.results[reqIdx];
                return {
                  ...node,
                  data: {
                    ...node.data,
                    responseTime: res.success ? Math.min(elapsed, 95) : 999, 
                  },
                };
              }
              return node;
            })
          );
        }
      } catch (err) {
        console.error("Live Monitor Error", err);
        setNodes((nds) =>
           nds.map(node => node.data.isMaster ? node : { ...node, data: { ...node.data, responseTime: 999 }})
        );
      }
    };

    monitoringTimerRef.current = setInterval(pollDevices, 2000); 

    return () => {
      if (monitoringTimerRef.current) clearInterval(monitoringTimerRef.current);
    };
  }, [isLiveMonitoring, nodes, connection, isConnectionReady, setNodes]);

  const hasDevices = scannedDevices.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center">
            <Network className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t('topo_title')}</h2>
            <p className="text-sm text-slate-500">{t('topo_subtitle')}</p>
          </div>
        </div>

        {hasDevices && isConnectionReady && (
          <div className="flex items-center gap-3">
            <button
              onClick={onSaveLayout}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
              title="Save current nodes and edges layout"
            >
              <Save className="w-4 h-4" />
              Save Layout
            </button>
            <button
              onClick={onAutoLayout}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
              title="Automatically arrange nodes left-to-right"
            >
              <LayoutGrid className="w-4 h-4" />
              Auto Layout
            </button>
            <button
              onClick={() => setIsLiveMonitoring(!isLiveMonitoring)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isLiveMonitoring
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
            >
              {isLiveMonitoring ? (
                <>
                  <Pause className="w-4 h-4" />
                  Stop Live Monitor
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  Start Live Monitor
                </>
              )}
            </button>
          </div>
        )}
      </div>

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
            {t('topo_drag_hint')}. Select edges and press Backspace to delete. You can Save Layout after dragging.
          </p>
        </div>
      )}

      {hasDevices ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ height: 520 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            deleteKeyCode={['Backspace', 'Delete']}
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

export default function TopologyPage() {
  return (
    <ReactFlowProvider>
      <TopologyCanvas />
    </ReactFlowProvider>
  );
}
