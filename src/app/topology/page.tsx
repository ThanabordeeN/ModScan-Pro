"use client";

import { useEffect, useMemo, useCallback, useRef, useState } from "react";
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
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Network,
  Search,
  Info,
  Activity,
  Pause,
  LayoutGrid,
  Plus,
  Hash,
  Cpu,
  X,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import * as dagre from "dagre";

import { useModbus } from "@/context/ModbusContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProject } from "@/context/ProjectContext";
import { useTheme } from "@/context/ThemeContext";
import ModbusDeviceNode from "@/components/ModbusDeviceNode";
import { modbusAPI } from "@/lib/electron-api";
import {
  getWindowItem,
  setWindowItem,
  removeWindowItem,
} from "@/lib/window-storage";

const nodeTypes: NodeTypes = {
  modbusDevice: ModbusDeviceNode,
};

const LAYOUT_STORAGE_KEY = "topo_save_default";

// Dimensions for the modbusDevice node (estimate based on ModbusDeviceNode size)
const nodeWidth = 160;
const nodeHeight = 80;

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = "LR",
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
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
    newNode.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
    return newNode;
  });

  return { nodes: newNodes, edges };
};

function TopologyCanvas() {
  const {
    scannedDevices,
    connection,
    isConnectionReady,
    isLiveMonitoring,
    setIsLiveMonitoring,
    requestStartProcess,
    demoMode,
    setSelectedSlaveId,
  } = useModbus();
  const { t } = useLanguage();
  const { getDeviceDisplayName } = useProject();
  const { theme } = useTheme();
  const { fitView } = useReactFlow();
  const isDark = theme === "dark";

  const masterTxt = t("topo_master");

  // --- State ---
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [customAddress, setCustomAddress] = useState("");
  const monitoringTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  // --- Helper: create a master node ---
  const createMasterNode = useCallback(
    (): Node => ({
      id: "master",
      type: "modbusDevice",
      position: { x: 50, y: 200 },
      data: { address: 0, responseTime: 0, label: masterTxt, isMaster: true },
      draggable: true,
    }),
    [masterTxt],
  );

  // --- Helper: create a device node ---
  const createDeviceNode = useCallback(
    (address: number, position?: { x: number; y: number }): Node => {
      const existingNodes = nodes.filter((n) => !n.data.isMaster);
      const cols = 4;
      const idx = existingNodes.length;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const defaultPos = position || { x: 300 + col * 200, y: 50 + row * 120 };

      return {
        id: `device-${address}`,
        type: "modbusDevice",
        position: defaultPos,
        data: {
          address,
          responseTime: 0,
          label: getDeviceDisplayName(address),
        },
        draggable: true,
      };
    },
    [nodes, getDeviceDisplayName],
  );

  // --- Helper: create edge from master to device ---
  const createEdge = useCallback(
    (address: number): Edge => ({
      id: `edge-master-${address}`,
      source: "master",
      target: `device-${address}`,
      animated: true,
      interactionWidth: 20,
    }),
    [],
  );

  // --- Load saved layout OR initialize from scanned devices on mount ---
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const savedStr = getWindowItem(LAYOUT_STORAGE_KEY);
      if (savedStr) {
        const { nodes: savedNodes, edges: savedEdges } = JSON.parse(savedStr);
        if (savedNodes && savedNodes.length > 0) {
          setNodes(savedNodes);
          setEdges(savedEdges || []);
          setTimeout(() => fitView({ padding: 0.3, duration: 800 }), 100);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to parse saved topology", e);
    }

    // No saved layout — build from scanned devices
    if (scannedDevices.length > 0) {
      const initNodes: Node[] = [createMasterNode()];
      const initEdges: Edge[] = [];
      scannedDevices.forEach((device, idx) => {
        const cols = 4;
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        initNodes.push({
          id: `device-${device.address}`,
          type: "modbusDevice",
          position: { x: 300 + col * 200, y: 50 + row * 120 },
          data: {
            address: device.address,
            responseTime: device.responseTime,
            label: getDeviceDisplayName(device.address),
          },
          draggable: true,
        });
        initEdges.push(createEdge(device.address));
      });
      setNodes(initNodes);
      setEdges(initEdges);
      setTimeout(() => fitView({ padding: 0.3, duration: 800 }), 100);
    } else {
      // Empty canvas with just master
      setNodes([createMasterNode()]);
      setEdges([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Add a node by address ---
  const addNodeByAddress = useCallback(
    (address: number) => {
      setSelectedSlaveId(address);
      // Check if node already exists
      const exists = nodes.some((n) => n.id === `device-${address}`);
      if (exists) return;

      // Ensure master node exists
      const hasMaster = nodes.some((n) => n.id === "master");
      if (!hasMaster) {
        setNodes((prev) => [createMasterNode(), ...prev]);
      }

      const newNode = createDeviceNode(address);
      const newEdge = createEdge(address);

      setNodes((prev) => [...prev, newNode]);
      setEdges((prev) => [...prev, newEdge]);

      setTimeout(() => fitView({ padding: 0.3, duration: 500 }), 100);
    },
    [
      nodes,
      createMasterNode,
      createDeviceNode,
      createEdge,
      setNodes,
      setEdges,
      fitView,
      setSelectedSlaveId,
    ],
  );

  // --- Add custom node ---
  const handleAddCustomNode = useCallback(() => {
    const addr = parseInt(customAddress, 10);
    if (isNaN(addr) || addr < 1 || addr > 247) return;
    addNodeByAddress(addr);
    setCustomAddress("");
    setShowAddPanel(false);
  }, [customAddress, addNodeByAddress]);

  // --- Add scanned node ---
  const handleAddScannedNode = useCallback(
    (address: number) => {
      addNodeByAddress(address);
    },
    [addNodeByAddress],
  );

  // --- Connection handler ---
  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            interactionWidth: 20,
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  // --- Auto Layout ---
  const onAutoLayout = useCallback(() => {
    if (nodes.length < 2) return;
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      "LR",
    );
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    setTimeout(() => fitView({ padding: 0.3, duration: 800 }), 50);
  }, [nodes, edges, setNodes, setEdges, fitView]);

  // --- Auto-save Layout (debounced) ---
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!initializedRef.current) return; // Don't save before initial load
    if (nodes.length === 0) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      try {
        const safeNodesToSave = nodes.map((n) => ({
          ...n,
          data: { ...n.data, responseTime: 0 },
        }));
        setWindowItem(
          LAYOUT_STORAGE_KEY,
          JSON.stringify({ nodes: safeNodesToSave, edges }),
        );
      } catch (e) {
        console.error("Auto-save layout failed", e);
      }
    }, 500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [nodes, edges]);

  // --- Reset Layout (rebuild from scanned devices) ---
  const onResetLayout = useCallback(() => {
    removeWindowItem(LAYOUT_STORAGE_KEY);
    const initNodes: Node[] = [createMasterNode()];
    const initEdges: Edge[] = [];
    scannedDevices.forEach((device, idx) => {
      const cols = 4;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      initNodes.push({
        id: `device-${device.address}`,
        type: "modbusDevice",
        position: { x: 300 + col * 200, y: 50 + row * 120 },
        data: {
          address: device.address,
          responseTime: device.responseTime,
          label: getDeviceDisplayName(device.address),
        },
        draggable: true,
      });
      initEdges.push(createEdge(device.address));
    });
    setNodes(initNodes);
    setEdges(initEdges);
    setTimeout(() => fitView({ padding: 0.3, duration: 800 }), 100);
  }, [
    scannedDevices,
    createMasterNode,
    createEdge,
    getDeviceDisplayName,
    setNodes,
    setEdges,
    fitView,
  ]);

  // --- Live Monitoring Effect ---
  useEffect(() => {
    if (!isLiveMonitoring || !isConnectionReady) {
      if (monitoringTimerRef.current) clearInterval(monitoringTimerRef.current);
      return;
    }

    const pollDevices = async () => {
      const deviceNodes = nodes.filter((n) => !n.data.isMaster);
      if (deviceNodes.length === 0) return;

      const requests = deviceNodes.map((node) => ({
        slaveAddress: node.data.address as number,
        functionCode: 3 as const,
        registerAddress: 0,
        quantity: 1,
      }));

      const startTime = Date.now();
      try {
        if (demoMode) {
          setNodes((nds) =>
            nds.map((node) => {
              if (node.data.isMaster) return node;
              const address = node.data.address as number;
              const device = scannedDevices.find((d) => d.address === address);
              return {
                ...node,
                data: {
                  ...node.data,
                  responseTime: device
                    ? Math.min(
                        95,
                        device.responseTime +
                          (Math.floor(Date.now() / 1000) % 6),
                      )
                    : 999,
                },
              };
            }),
          );
          return;
        }

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
              const reqIdx = requests.findIndex(
                (req) => req.slaveAddress === node.data.address,
              );
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
            }),
          );
        }
      } catch (err) {
        console.error("Live Monitor Error", err);
        setNodes((nds) =>
          nds.map((node) =>
            node.data.isMaster
              ? node
              : { ...node, data: { ...node.data, responseTime: 999 } },
          ),
        );
      }
    };

    monitoringTimerRef.current = setInterval(pollDevices, 2000);

    return () => {
      if (monitoringTimerRef.current) clearInterval(monitoringTimerRef.current);
    };
  }, [
    isLiveMonitoring,
    nodes,
    connection,
    isConnectionReady,
    setNodes,
    demoMode,
    scannedDevices,
  ]);

  // --- Derived: which scanned devices are not yet on the canvas ---
  const availableScannedDevices = useMemo(() => {
    const existingIds = new Set(
      nodes.filter((n) => !n.data.isMaster).map((n) => n.data.address),
    );
    return scannedDevices.filter((d) => !existingIds.has(d.address));
  }, [scannedDevices, nodes]);

  const hasNodes = nodes.length > 1; // more than just master

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 instrument-panel bg-instrument-accent/5 border-instrument-accent/20 text-instrument-accent flex items-center justify-center">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-app-text">
              {t("topo_title")}
            </h1>
            <p className="text-sm text-app-muted">{t("topo_subtitle")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Node */}
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="instrument-button-primary flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("topo_add_node")}
          </button>

          {/* Auto Layout */}
          <button
            onClick={onAutoLayout}
            className="instrument-button flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
            title="Automatically arrange nodes left-to-right"
          >
            <LayoutGrid className="w-4 h-4" />
            {t("topo_auto_layout") || "Auto Layout"}
          </button>

          {/* Reset */}
          <button
            onClick={onResetLayout}
            className="instrument-button flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors"
            title="Reset layout to scanned devices"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>

          {/* Live Monitor */}
          {isConnectionReady && (
            <button
              onClick={() => {
                if (!isLiveMonitoring) {
                  requestStartProcess("topology", () =>
                    setIsLiveMonitoring(true),
                  );
                } else {
                  setIsLiveMonitoring(false);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 instrument-button text-sm font-medium transition-colors ${
                isLiveMonitoring
                  ? "bg-instrument-accent text-white border-transparent"
                  : ""
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
          )}
        </div>
      </div>

      {/* Add Node Panel */}
      {showAddPanel && (
        <div className="instrument-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-app-text flex items-center gap-2">
              <Plus className="w-4 h-4 text-instrument-accent" />
              Add Node to Topology
            </h3>
            <button
              onClick={() => setShowAddPanel(false)}
              className="p-1 instrument-button hover:bg-app-surface"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* From Scanned Devices */}
            <div>
              <h4 className="text-[10px] font-bold text-app-muted uppercase tracking-wider mb-3">
                Scanned Devices ({availableScannedDevices.length} available)
              </h4>
              {availableScannedDevices.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableScannedDevices.map((device) => (
                    <button
                      key={device.address}
                      onClick={() => handleAddScannedNode(device.address)}
                      className="flex items-center gap-1.5 px-3 py-1.5 instrument-button text-xs font-medium transition-colors"
                    >
                      <Hash className="w-3 h-3" />
                      {getDeviceDisplayName(device.address)}
                      <span className="text-instrument-accent ml-1 font-mono">
                        {device.responseTime}ms
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-app-muted italic">
                  {scannedDevices.length === 0
                    ? "No scanned devices. Go to Scan tab first."
                    : "All scanned devices are already on the topology."}
                </p>
              )}
            </div>

            {/* Custom Node */}
            <div>
              <h4 className="text-[10px] font-bold text-app-muted uppercase tracking-wider mb-3">
                Custom Node
              </h4>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Cpu className="w-4 h-4 text-app-muted" />
                  <input
                    type="number"
                    min={1}
                    max={247}
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleAddCustomNode()
                    }
                    placeholder="Slave Address (1-247)"
                    className="instrument-input flex-1 font-mono"
                  />
                </div>
                <button
                  onClick={handleAddCustomNode}
                  disabled={
                    !customAddress ||
                    parseInt(customAddress) < 1 ||
                    parseInt(customAddress) > 247
                  }
                  className="instrument-button-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {hasNodes && (
        <div className="instrument-panel p-4">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-[10px] font-bold text-app-muted uppercase tracking-wider">
              {t("topo_legend")}:
            </span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-instrument-accent border border-instrument-accent" />
              <span className="text-xs text-app-muted font-medium">
                &lt; 100ms — {t("topo_legend_good")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-instrument-accent/50 border border-instrument-accent/30" />
              <span className="text-xs text-app-muted font-medium">
                100–300ms — {t("topo_legend_medium")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-instrument-danger border border-instrument-danger" />
              <span className="text-xs text-app-muted font-medium">
                &gt; 300ms — {t("topo_legend_poor")}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-app-muted mt-2 flex items-center gap-1 opacity-70">
            <Info className="w-3 h-3" />
            {t("topo_drag_hint")}. Select nodes/edges and press Backspace to
            delete. Layout is saved automatically.
          </p>
        </div>
      )}

      {/* React Flow Canvas */}
      <div className="instrument-panel overflow-hidden" style={{ height: 550 }}>
        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            deleteKeyCode={["Backspace", "Delete"]}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              gap={20}
              size={1}
              color={isDark ? "#1f2937" : "#e2e8f0"}
            />
            <Controls
              showInteractive={false}
              className="instrument-panel !border-none !bg-app-surface !shadow-panel"
            />
            <MiniMap
              nodeColor={(node) => {
                if (node.data?.isMaster) return isDark ? "#38bdf8" : "#0891b2";
                const rt = node.data?.responseTime ?? 0;
                if (rt < 100) return "#38bdf8";
                if (rt < 300) return "rgba(56, 189, 248, 0.4)";
                return "#ef4444";
              }}
              maskColor={
                isDark ? "rgba(10, 14, 26, 0.7)" : "rgba(241, 245, 249, 0.7)"
              }
              className="instrument-panel !border-app-border !bg-app-bg"
              style={{ borderRadius: 0 }}
            />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full bg-app-bg">
            <div className="text-center">
              <div className="w-16 h-16 bg-app-surface instrument-panel-strong flex items-center justify-center mx-auto mb-4 border border-app-border">
                <Search className="w-8 h-8 text-app-muted" />
              </div>
              <h3 className="text-lg font-semibold text-app-text mb-2">
                {t("topo_no_devices")}
              </h3>
              <p className="text-sm text-app-muted mb-6">
                {t("topo_scan_hint")}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/scan"
                  className="instrument-button-primary inline-flex items-center gap-2 px-6 py-2"
                >
                  <Search className="w-4 h-4" />
                  {t("topo_scan_link")}
                </Link>
                <button
                  onClick={() => setShowAddPanel(true)}
                  className="instrument-button inline-flex items-center gap-2 px-6 py-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Node
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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
