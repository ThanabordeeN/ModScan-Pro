'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, Save, Upload, Trash2, Plus, XCircle, CheckCircle2, Clock, Tag } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useModbus } from '@/context/ModbusContext';
import { useLanguage } from '@/context/LanguageContext';
import type { DeviceAlias } from '@/types/project';

export default function ProjectsPage() {
  const { t } = useLanguage();
  const {
    currentProject,
    projectFilePath,
    deviceAliases,
    setAlias,
    removeAlias,
    saveProject,
    loadProject,
    loadProjectFromPath,
    applyProject,
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
  } = useModbus();

  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newAliasId, setNewAliasId] = useState(1);
  const [newAliasName, setNewAliasName] = useState('');

  // Load current project values into form
  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name);
      setProjectDescription(currentProject.description || '');
    }
  }, [currentProject]);

  // Load recent projects on mount
  useEffect(() => {
    refreshRecentProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!projectName.trim()) {
      setMessage({ type: 'error', text: 'Project name is required' });
      return;
    }

    const result = await saveProject({
      name: projectName.trim(),
      description: projectDescription.trim(),
      connection,
      devices: deviceAliases,
      readRanges,
      settings: {
        refreshInterval,
        readTimeout,
      },
    });

    if (result.success) {
      setMessage({ type: 'success', text: t('project_save_success') });
    } else if (result.error !== 'cancelled') {
      setMessage({ type: 'error', text: result.error || t('project_save_error') });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const handleLoad = async () => {
    const result = await loadProject();
    if (result.success) {
      setMessage({ type: 'success', text: t('project_load_success') });
      setTimeout(() => setMessage(null), 3000);
    } else if (result.error && result.error !== 'cancelled') {
      setMessage({ type: 'error', text: result.error || t('project_load_error') });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleLoadRecent = async (filePath: string) => {
    const result = await loadProjectFromPath(filePath);
    if (result.success) {
      setMessage({ type: 'success', text: t('project_load_success') });
    } else {
      setMessage({ type: 'error', text: result.error || t('project_load_error') });
    }
    setTimeout(() => setMessage(null), 3000);
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
        if (currentProject.settings.refreshInterval) setRefreshInterval(currentProject.settings.refreshInterval);
        if (currentProject.settings.readTimeout) setReadTimeout(currentProject.settings.readTimeout);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

  const handleAddAlias = () => {
    if (!newAliasName.trim()) return;
    setAlias(newAliasId, newAliasName.trim());
    setNewAliasName('');
    setNewAliasId(prev => prev + 1);
  };

  const handleAddFromScanned = (address: number) => {
    const existing = deviceAliases.find(d => d.slaveId === address);
    if (!existing) {
      setAlias(address, '');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
          <FolderOpen className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('project_title')}</h1>
          <p className="text-sm text-slate-600">{t('project_subtitle')}</p>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Current Project Info */}
      {currentProject && (
        <div className="bg-white rounded-xl p-6 border border-indigo-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-600" />
              {t('project_current')}
            </h2>
            <button
              onClick={clearProject}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              {t('project_clear')}
            </button>
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium text-slate-700">{t('project_name')}:</span> {currentProject.name}</p>
            {currentProject.description && (
              <p><span className="font-medium text-slate-700">{t('project_description')}:</span> {currentProject.description}</p>
            )}
            {projectFilePath && (
              <p className="text-xs text-slate-400 font-mono truncate">{projectFilePath}</p>
            )}
          </div>
        </div>
      )}

      {/* Save/Load Actions */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('project_save')}/{t('project_load')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">{t('project_name')}</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Modbus Project"
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">{t('project_description')}</label>
            <input
              type="text"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Optional description..."
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-all shadow-sm"
          >
            <Save className="w-4 h-4" />
            {t('project_save')}
          </button>
          <button
            onClick={handleLoad}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-medium transition-all"
          >
            <Upload className="w-4 h-4" />
            {t('project_load')}
          </button>
        </div>
      </div>

      {/* Device Aliases */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-600" />
            {t('project_devices')}
          </h2>
        </div>

        {/* Scanned Devices Quick Add */}
        {scannedDevices.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-cyan-50 border border-cyan-200">
            <p className="text-xs font-medium text-cyan-700 mb-2">Add from scanned devices:</p>
            <div className="flex flex-wrap gap-2">
              {scannedDevices.map((device) => {
                const hasAlias = deviceAliases.some(d => d.slaveId === device.address);
                return (
                  <button
                    key={device.address}
                    onClick={() => handleAddFromScanned(device.address)}
                    disabled={hasAlias}
                    className={`px-3 py-1.5 rounded-lg font-mono text-sm transition-all ${
                      hasAlias
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-white text-cyan-700 hover:bg-cyan-100 border border-cyan-300'
                    }`}
                  >
                    ID: {device.address} {hasAlias && '✓'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Aliases List */}
        {deviceAliases.length > 0 && (
          <div className="space-y-2 mb-4">
            {deviceAliases.map((device) => (
              <div key={device.slaveId} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-mono font-bold text-sm min-w-[60px] justify-center">
                  ID: {device.slaveId}
                </span>
                <input
                  type="text"
                  value={device.alias}
                  onChange={(e) => setAlias(device.slaveId, e.target.value, device.description)}
                  placeholder="Enter alias name..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <button
                  onClick={() => removeAlias(device.slaveId)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Alias */}
        <div className="flex items-end gap-3 pt-3 border-t border-slate-100">
          <div className="w-24">
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('project_slave_id')}</label>
            <input
              type="number"
              min={1}
              max={247}
              value={newAliasId}
              onChange={(e) => setNewAliasId(Math.min(247, Math.max(1, Number(e.target.value))))}
              className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('project_alias')}</label>
            <input
              type="text"
              value={newAliasName}
              onChange={(e) => setNewAliasName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAlias()}
              placeholder="e.g. เซ็นเซอร์อุณหภูมิเตาเผา 1"
              className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <button
            onClick={handleAddAlias}
            disabled={!newAliasName.trim()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-medium text-sm transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {t('project_add_device')}
          </button>
        </div>

        {deviceAliases.length === 0 && (
          <p className="text-sm text-slate-400 mt-4 text-center py-4">{t('project_no_project')}</p>
        )}
      </div>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-slate-500" />
            {t('project_recent')}
          </h2>
          <div className="space-y-2">
            {recentProjects.map((project, index) => (
              <button
                key={index}
                onClick={() => project.filePath ? handleLoadRecent(project.filePath) : null}
                disabled={!project.filePath}
                className="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50"
              >
                <p className="font-medium text-slate-900 text-sm">{project.name}</p>
                {project.filePath && (
                  <p className="text-xs text-slate-400 font-mono truncate mt-1">{project.filePath}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(project.lastOpened).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
