"use client";

import { useState, useEffect } from "react";
import {
  FolderOpen,
  Upload,
  Trash2,
  Plus,
  XCircle,
  CheckCircle2,
  Clock,
  Tag,
  Download,
  AppWindow,
} from "lucide-react";
import { useProject } from "@/context/ProjectContext";
import { useModbus } from "@/context/ModbusContext";
import { useLanguage } from "@/context/LanguageContext";
import { windowAPI, isElectron } from "@/lib/electron-api";
import { getWindowItem, setWindowItem } from "@/lib/window-storage";

export default function ProjectsPage() {
  const { t } = useLanguage();
  const {
    currentProject,
    projectFilePath,
    deviceAliases,
    setAlias,
    removeAlias,
    registerAliases,
    saveProject,
    loadProject,
    loadProjectFromPath,
    clearProject,
    recentProjects,
    refreshRecentProjects,
  } = useProject();

  const {
    connection,
    setConnection,
    readRanges,
    setReadRanges,
    refreshInterval,
    setRefreshInterval,
    readTimeout,
    setReadTimeout,
    scannedDevices,
    setScannedDevices,
    readData,
    setReadData,
    scanStartAddr,
    setScanStartAddr,
    scanEndAddr,
    setScanEndAddr,
    scanTimeout,
    setScanTimeout,
    selectedRegisters,
    setSelectedRegisters,
    setSelectedSlaveId,
  } = useModbus();

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectNotes, setProjectNotes] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [newAliasId, setNewAliasId] = useState(1);
  const [newAliasName, setNewAliasName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load current project values into form
  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name);
      setProjectDescription(currentProject.description || "");
      setProjectNotes(currentProject.notes || "");
    }
  }, [currentProject]);

  // Load recent projects on mount
  useEffect(() => {
    refreshRecentProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update window title when project changes
  useEffect(() => {
    if (currentProject?.name) {
      windowAPI.setTitle(currentProject.name);
    }
  }, [currentProject?.name]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    globalThis.setTimeout(() => setMessage(null), 4000);
  };

  const handleSave = async () => {
    if (!projectName.trim()) {
      showMessage("error", t("project_name") + " is required");
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveProject({
        name: projectName.trim(),
        description: projectDescription.trim(),
        notes: projectNotes.trim() || undefined,
        connection,
        devices: deviceAliases,
        readRanges,
        settings: {
          refreshInterval,
          readTimeout,
          selectedRegisters: Array.from(selectedRegisters),
        },
        scanSettings: {
          startAddress: typeof scanStartAddr === "number" ? scanStartAddr : 1,
          endAddress: typeof scanEndAddr === "number" ? scanEndAddr : 247,
          timeout: typeof scanTimeout === "number" ? scanTimeout : 1000,
        },
        scannedDevices,
        readData: readData || undefined,
        topologyLayout: (() => {
          try {
            const saved = getWindowItem("topo_save_default");
            return saved ? JSON.parse(saved) : undefined;
          } catch {
            return undefined;
          }
        })(),
        registerAliases,
      });

      if (result.success) {
        showMessage("success", t("project_save_success"));
        await refreshRecentProjects();
      } else if (result.error !== "cancelled") {
        showMessage("error", result.error || t("project_save_error"));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async () => {
    setIsLoading(true);
    try {
      const result = await loadProject();
      if (result.success) {
        showMessage("success", t("project_load_success"));
      } else if (result.error && result.error !== "cancelled") {
        showMessage("error", result.error || t("project_load_error"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadRecent = async (filePath: string) => {
    setIsLoading(true);
    try {
      const result = await loadProjectFromPath(filePath);
      if (result.success) {
        showMessage("success", t("project_load_success"));
      } else {
        showMessage("error", result.error || t("project_load_error"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // When a project is loaded, apply its settings to the Modbus context
  useEffect(() => {
    if (currentProject) {
      if (currentProject.connection) {
        setConnection(currentProject.connection);
      }
      if (currentProject.readRanges && currentProject.readRanges.length > 0) {
        setReadRanges(currentProject.readRanges);
      }
      if (currentProject.settings) {
        if (currentProject.settings.refreshInterval)
          setRefreshInterval(currentProject.settings.refreshInterval);
        if (currentProject.settings.readTimeout)
          setReadTimeout(currentProject.settings.readTimeout);
        if (currentProject.settings.selectedRegisters) {
          setSelectedRegisters(
            new Set(currentProject.settings.selectedRegisters),
          );
        }
      }
      if (currentProject.scanSettings) {
        setScanStartAddr(currentProject.scanSettings.startAddress);
        setScanEndAddr(currentProject.scanSettings.endAddress);
        setScanTimeout(currentProject.scanSettings.timeout);
      }
      if (currentProject.scannedDevices) {
        setScannedDevices(currentProject.scannedDevices);
        if (currentProject.scannedDevices.length > 0) {
          setSelectedSlaveId(currentProject.scannedDevices[0].address);
        }
      }
      if (currentProject.readData) {
        setReadData(currentProject.readData);
      }
      if (currentProject.topologyLayout) {
        setWindowItem(
          "topo_save_default",
          JSON.stringify(currentProject.topologyLayout),
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

  const handleAddAlias = () => {
    if (!newAliasName.trim()) return;
    setAlias(newAliasId, newAliasName.trim());
    setNewAliasName("");
    setNewAliasId((prev) => prev + 1);
  };

  const handleAddFromScanned = (address: number) => {
    const existing = deviceAliases.find((d) => d.slaveId === address);
    if (!existing) {
      setAlias(address, "");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 instrument-panel bg-instrument-accent/5 border-instrument-accent/20 text-instrument-accent flex items-center justify-center">
          <FolderOpen className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-app-text">
            {t("project_title")}
          </h1>
          <p className="text-sm text-app-muted">{t("project_subtitle")}</p>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`p-4 instrument-input flex items-center gap-2 transition-all ${
            message.type === "success"
              ? "bg-emerald-50 dark:instrument-accent/20 border instrument-accent dark:instrument-accent instrument-accent dark:instrument-accent"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Current Project Info */}
      {currentProject && (
        <div className="instrument-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 instrument-accent dark:instrument-accent" />
              {t("project_current")}
            </h2>
            <button
              onClick={clearProject}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              {t("project_clear")}
            </button>
          </div>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {t("project_name")}:
              </span>{" "}
              {currentProject.name}
            </p>
            {currentProject.description && (
              <p>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {t("project_description")}:
                </span>{" "}
                {currentProject.description}
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentProject.devices?.length || 0}{" "}
              {t("project_devices").toLowerCase()} ·{" "}
              {currentProject.readRanges?.length || 0} read ranges ·{" "}
              {currentProject.scannedDevices?.length || 0}{" "}
              {t("project_scanned_devices").toLowerCase()}
            </p>
            {projectFilePath && (
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">
                {projectFilePath}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Save/Load Actions */}
      <div className="instrument-panel p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {t("project_save")}/{t("project_load")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="instrument-label mb-2">{t("project_name")}</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Modbus Project"
              className="instrument-input w-full"
            />
          </div>
          <div>
            <label className="instrument-label mb-2">
              {t("project_description")}
            </label>
            <input
              type="text"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Optional description..."
              className="instrument-input w-full"
            />
          </div>
        </div>

        {/* Topology Notes */}
        <div className="mb-6">
          <label className="instrument-label mb-2">
            {t("project_topology_notes")}
          </label>
          <textarea
            value={projectNotes}
            onChange={(e) => setProjectNotes(e.target.value)}
            placeholder={t("project_topology_placeholder")}
            rows={3}
            className="instrument-input w-full text-sm resize-y"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving || !projectName.trim()}
            className="instrument-button-primary flex items-center gap-2 px-4 py-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            {isSaving ? t("common_loading") : t("project_save")}
          </button>
          <button
            onClick={handleLoad}
            disabled={isLoading}
            className="instrument-button flex items-center gap-2 px-4 py-2"
          >
            <Upload className="w-4 h-4" />
            {isLoading ? t("common_loading") : t("project_load")}
          </button>
        </div>
      </div>

      {/* Device Aliases */}
      <div className="instrument-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tag className="w-5 h-5 instrument-accent dark:instrument-accent" />
            {t("project_devices")}
          </h2>
        </div>

        {/* Scanned Devices Quick Add */}
        {scannedDevices.length > 0 && (
          <div className="mb-4 p-3 instrument-panel bg-instrument-accent/5 border-instrument-accent/20">
            <p className="text-xs font-medium text-app-text mb-2">
              Add from scanned devices:
            </p>
            <div className="flex flex-wrap gap-2">
              {scannedDevices.map((device) => {
                const hasAlias = deviceAliases.some(
                  (d) => d.slaveId === device.address,
                );
                return (
                  <button
                    key={device.address}
                    onClick={() => handleAddFromScanned(device.address)}
                    disabled={hasAlias}
                    className={`px-3 py-1.5 instrument-input font-mono text-sm transition-all ${
                      hasAlias
                        ? "opacity-50 cursor-not-allowed"
                        : "instrument-button"
                    }`}
                  >
                    ID: {device.address} {hasAlias && "✓"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Aliases List */}
        {deviceAliases.length > 0 && (
          <div className="mb-4 border border-slate-200 dark:border-slate-700 rounded-instrument overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[80px_1fr_1fr_40px] gap-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <div className="px-3 py-2">{t("project_slave_id")}</div>
              <div className="px-3 py-2 border-l border-slate-200 dark:border-slate-700">{t("project_alias")}</div>
              <div className="px-3 py-2 border-l border-slate-200 dark:border-slate-700">Technical Remark</div>
              <div className="px-3 py-2 border-l border-slate-200 dark:border-slate-700" />
            </div>
            {/* Rows */}
            {deviceAliases.map((device, i) => (
              <div
                key={device.slaveId}
                className={`grid grid-cols-[80px_1fr_1fr_40px] gap-0 items-center ${i !== deviceAliases.length - 1 ? "border-b border-slate-200 dark:border-slate-700" : ""}`}
              >
                <div className="px-3 py-2 font-mono font-bold text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50">
                  ID: {device.slaveId}
                </div>
                <div className="border-l border-slate-200 dark:border-slate-700">
                  <input
                    type="text"
                    value={device.alias}
                    onChange={(e) => setAlias(device.slaveId, e.target.value, device.description, device.remark)}
                    placeholder={t("project_alias") + "..."}
                    className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:bg-amber-50 dark:focus:bg-amber-900/10"
                  />
                </div>
                <div className="border-l border-slate-200 dark:border-slate-700">
                  <input
                    type="text"
                    value={device.remark || ""}
                    onChange={(e) => setAlias(device.slaveId, device.alias, device.description, e.target.value)}
                    placeholder="Model, terminal..."
                    className="w-full px-3 py-2 bg-transparent text-slate-500 dark:text-slate-400 text-xs focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/50"
                  />
                </div>
                <div className="border-l border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  <button
                    onClick={() => removeAlias(device.slaveId)}
                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Alias */}
        <div className="flex items-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <div className="w-24">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t("project_slave_id")}
            </label>
            <input
              type="number"
              min={1}
              max={247}
              value={newAliasId}
              onChange={(e) =>
                setNewAliasId(
                  Math.min(247, Math.max(1, Number(e.target.value))),
                )
              }
              className="bg-white dark:bg-slate-800 w-full px-3 py-1.5 instrument-input border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t("project_alias")}
            </label>
            <input
              type="text"
              value={newAliasName}
              onChange={(e) => setNewAliasName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddAlias()}
              placeholder="e.g. เซ็นเซอร์อุณหภูมิเตาเผา 1"
              className="instrument-input w-full"
            />
          </div>
          <button
            onClick={handleAddAlias}
            disabled={!newAliasName.trim()}
            className="instrument-button flex items-center gap-1 px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {t("project_add_device")}
          </button>
        </div>

        {deviceAliases.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-4 text-center py-4">
            {t("project_no_devices")}
          </p>
        )}
      </div>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div className="instrument-panel p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            {t("project_recent")}
          </h2>
          <div className="space-y-2">
            {recentProjects.map((project, index) => (
              <div
                key={index}
                className="group w-full flex items-center justify-between p-3 instrument-input bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <button
                  onClick={() =>
                    project.filePath ? handleLoadRecent(project.filePath) : null
                  }
                  disabled={!project.filePath || isLoading}
                  className="flex-1 text-left min-w-0 disabled:opacity-50"
                >
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm group-hover:instrument-accent dark:group-hover:instrument-accent transition-colors">
                    {project.name}
                  </p>
                  {project.filePath && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate mt-1">
                      {project.filePath}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {new Date(project.lastOpened).toLocaleString()}
                  </p>
                </button>

                {isElectron() && project.filePath && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      windowAPI.openNew(project.filePath!);
                    }}
                    className="ml-3 p-2 instrument-input text-slate-400 dark:text-slate-500 hover:instrument-accent dark:hover:instrument-accent hover:bg-indigo-50 dark:hover:instrument-accent/20 transition-colors flex-shrink-0"
                    title={t("project_open_new_window")}
                  >
                    <AppWindow className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
