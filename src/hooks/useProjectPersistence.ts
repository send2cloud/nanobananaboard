import { useCallback } from 'react';
import { Node, Edge, useReactFlow } from 'reactflow';

const PROJECT_KEY = 'nano_banana_project_v1';

export const useProjectPersistence = (
    setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void, 
    setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void,
    onNotification: (msg: string) => void
) => {
  const { getNodes, getEdges } = useReactFlow();

  const saveToStorage = useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();

    // React Flow nodes contain 'data' objects with functions (callbacks).
    // JSON.stringify automatically strips functions, which is exactly what we want.
    const projectData = {
      nodes,
      edges,
      timestamp: Date.now(),
      version: '1.0'
    };

    try {
      localStorage.setItem(PROJECT_KEY, JSON.stringify(projectData));
      onNotification("Project saved to Local Storage");
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save project. Storage might be full.");
    }
  }, [getNodes, getEdges, onNotification]);

  const loadFromStorage = useCallback((): { nodes: Node[], edges: Edge[] } | null => {
    try {
      const stored = localStorage.getItem(PROJECT_KEY);
      if (!stored) {
        alert("No saved project found in Local Storage.");
        return null;
      }
      
      const data = JSON.parse(stored);
      
      // We return the raw data. The consumer (StoryboardFlow) must re-attach callbacks.
      onNotification(`Project loaded (${new Date(data.timestamp).toLocaleTimeString()})`);
      return { nodes: data.nodes, edges: data.edges };

    } catch (e) {
      console.error("Load failed", e);
      alert("Failed to load project data.");
      return null;
    }
  }, [onNotification]);

  const exportToJson = useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();
    
    const projectData = {
        nodes,
        edges,
        timestamp: Date.now(),
        version: '1.0'
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `nano-banana-board-${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    onNotification("Project exported to JSON");
  }, [getNodes, getEdges, onNotification]);

  const importFromJson = useCallback((file: File, callback: (nodes: Node[], edges: Edge[]) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            const data = JSON.parse(content);
            if (data.nodes && data.edges) {
                callback(data.nodes, data.edges);
                onNotification("Project imported from JSON");
            } else {
                alert("Invalid project file.");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to parse project file.");
        }
    };
    reader.readAsText(file);
  }, [onNotification]);

  return {
    saveToStorage,
    loadFromStorage,
    exportToJson,
    importFromJson
  };
};