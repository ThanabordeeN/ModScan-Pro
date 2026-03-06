'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import type { ProjectData, DeviceAlias, RecentProject } from '@/types/project';
import { projectAPI } from '@/lib/electron-api';

interface ProjectContextType {
  // Current project
  currentProject: ProjectData | null;
  projectFilePath: string | null;
  isProjectDirty: boolean;

  // Device aliases
  deviceAliases: DeviceAlias[];
  setDeviceAliases: (aliases: DeviceAlias[]) => void;
  getDeviceAlias: (slaveId: number) => string | null;
  getDeviceDisplayName: (slaveId: number) => string;
  setAlias: (slaveId: number, alias: string, description?: string, remark?: string) => void;
  removeAlias: (slaveId: number) => void;

  // Project actions
  saveProject: (projectData: Omit<ProjectData, 'version'>) => Promise<{ success: boolean; error?: string }>;
  loadProject: () => Promise<{ success: boolean; error?: string }>;
  loadProjectFromPath: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  applyProject: (data: ProjectData, filePath?: string) => void;
  clearProject: () => void;

  // Recent projects
  recentProjects: RecentProject[];
  refreshRecentProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children, onProjectLoad }: { children: ReactNode; onProjectLoad?: (data: ProjectData) => void }) {
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);
  const [projectFilePath, setProjectFilePath] = useState<string | null>(null);
  const [isProjectDirty, setIsProjectDirty] = useState(false);
  const [deviceAliases, setDeviceAliasesState] = useState<DeviceAlias[]>([]);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const hasLoaded = useRef(false);

  // Load aliases from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !hasLoaded.current) {
      const savedAliases = localStorage.getItem('modscan_device_aliases');
      if (savedAliases) {
        try {
          setDeviceAliasesState(JSON.parse(savedAliases));
        } catch {
          // ignore
        }
      }
      hasLoaded.current = true;
    }
  }, []);

  // Persist aliases to localStorage
  useEffect(() => {
    if (hasLoaded.current) {
      localStorage.setItem('modscan_device_aliases', JSON.stringify(deviceAliases));
    }
  }, [deviceAliases]);

  // Load recent projects on mount
  useEffect(() => {
    refreshRecentProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDeviceAliases = useCallback((aliases: DeviceAlias[]) => {
    setDeviceAliasesState(aliases);
    setIsProjectDirty(true);
  }, []);

  const getDeviceAlias = useCallback((slaveId: number): string | null => {
    const device = deviceAliases.find(d => d.slaveId === slaveId);
    return device?.alias || null;
  }, [deviceAliases]);

  const getDeviceDisplayName = useCallback((slaveId: number): string => {
    const alias = getDeviceAlias(slaveId);
    return alias ? `${alias} (ID:${slaveId})` : `ID:${slaveId}`;
  }, [getDeviceAlias]);

  const setAlias = useCallback((slaveId: number, alias: string, description?: string, remark?: string) => {
    setDeviceAliasesState(prev => {
      const existing = prev.findIndex(d => d.slaveId === slaveId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], slaveId, alias, description, remark };
        return updated;
      }
      return [...prev, { slaveId, alias, description, remark }];
    });
    setIsProjectDirty(true);
  }, []);

  const removeAlias = useCallback((slaveId: number) => {
    setDeviceAliasesState(prev => prev.filter(d => d.slaveId !== slaveId));
    setIsProjectDirty(true);
  }, []);

  const applyProject = useCallback((data: ProjectData, filePath?: string) => {
    setCurrentProject(data);
    setProjectFilePath(filePath || null);
    setDeviceAliasesState(data.devices || []);
    setIsProjectDirty(false);
    if (onProjectLoad) {
      onProjectLoad(data);
    }
  }, [onProjectLoad]);

  const saveProject = useCallback(async (projectData: Omit<ProjectData, 'version'>): Promise<{ success: boolean; error?: string }> => {
    const result = await projectAPI.save(projectData);
    if (result.success) {
      setCurrentProject({ version: 1, ...projectData });
      if (result.filePath) setProjectFilePath(result.filePath);
      setIsProjectDirty(false);
      await refreshRecentProjects();
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProject = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const result = await projectAPI.load();
    if (result.success && result.data) {
      applyProject(result.data, result.filePath);
      await refreshRecentProjects();
      return { success: true };
    }
    if (result.cancelled) return { success: false, error: 'cancelled' };
    return { success: false, error: result.error };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyProject]);

  const loadProjectFromPath = useCallback(async (filePath: string): Promise<{ success: boolean; error?: string }> => {
    const result = await projectAPI.loadPath(filePath);
    if (result.success && result.data) {
      applyProject(result.data, result.filePath);
      await refreshRecentProjects();
      return { success: true };
    }
    return { success: false, error: result.error };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyProject]);

  const clearProject = useCallback(() => {
    setCurrentProject(null);
    setProjectFilePath(null);
    setIsProjectDirty(false);
  }, []);

  const refreshRecentProjects = useCallback(async () => {
    const result = await projectAPI.recent();
    if (result.success && result.projects) {
      setRecentProjects(result.projects);
    }
  }, []);

  return (
    <ProjectContext.Provider value={{
      currentProject,
      projectFilePath,
      isProjectDirty,
      deviceAliases,
      setDeviceAliases,
      getDeviceAlias,
      getDeviceDisplayName,
      setAlias,
      removeAlias,
      saveProject,
      loadProject,
      loadProjectFromPath,
      applyProject,
      clearProject,
      recentProjects,
      refreshRecentProjects,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
