import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  BackgroundVariant,
  useReactFlow,
  Panel,
  useStoreApi,
} from 'reactflow';
// Imports from atomic node components
import { StartNode } from './nodes/StartNode';
import { ImageNode } from './nodes/ImageNode';
import { VariationNode } from './nodes/VariationNode';
import { GridNode } from './nodes/GridNode';
import { GroupNode } from './nodes/GroupNode';
import { 
  NodeType, 
  ImageNodeData, 
  VariationNodeData, 
  StartNodeData, 
  GridNodeData, 
  GroupNodeData,
  VariationConfig, 
  GenerationConfig,
  AppSettings,
  Provider
} from '../types';
import { generateImageFromConfig, generateImageVariation, getVariationSuggestions, enhancePrompt, editGeneratedImage } from '../services/geminiService';
import { Settings, X, Layers, AlertCircle, RefreshCw, CheckCircle2, Save, ChevronDown, ChevronUp, Download, Upload, HardDrive, FileJson } from 'lucide-react';
import { useAppSettings } from '../hooks/useAppSettings';
import { useGraphLayout } from '../hooks/useGraphLayout';
import { useProjectPersistence } from '../hooks/useProjectPersistence';

const NODE_WIDTH = 400;
const STORAGE_KEY = 'nano_banana_settings_v2'; 

const initialNodes: Node[] = [
  {
    id: 'start-1',
    type: NodeType.START,
    position: { x: 100, y: 300 },
    data: {},
  },
];

const FlowEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, getNodes } = useReactFlow();

  // --- Global App Settings ---
  const [showSettings, setShowSettings] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Custom Hooks
  const { appSettings, setAppSettings, isSaving } = useAppSettings();
  const { findPositionForNewNode } = useGraphLayout();
  
  // Use notification wrapper for hooks
  const notify = useCallback((msg: string) => setNotification(msg), []);
  const { saveToStorage, loadFromStorage, exportToJson, importFromJson } = useProjectPersistence(setNodes, setEdges, notify);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear notification after 3 seconds
  useEffect(() => {
    if (notification) {
        const timer = setTimeout(() => setNotification(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [notification]);

  // Use refs for callbacks to avoid stale closures in React Flow handlers
  const handleAddVariationRef = useRef<(id: string) => void>(() => {});
  const handleBranchRef = useRef<(imageUrl: string, prompt: string, parentId: string) => void>(() => {});
  const handleUngroupRef = useRef<(id: string) => void>(() => {});
  const handleToggleCollapseRef = useRef<(id: string, collapsed: boolean) => void>(() => {});
  const handleSuggestRef = useRef<(category: string, count: number, context: string) => Promise<string[]>>((c, n, ctx) => Promise.resolve([]));
  const handleEnhanceRef = useRef<(config: GenerationConfig) => Promise<string>>(() => Promise.resolve(""));
  const handleEditImageRef = useRef<(id: string, prompt: string) => void>(() => {});
  const appSettingsRef = useRef<AppSettings>(appSettings);

  useEffect(() => {
    appSettingsRef.current = appSettings;
    
    // Update visualization of Start nodes if provider changes
    setNodes(nds => nds.map(n => {
        if (n.type === NodeType.START) {
            let providerName = 'Nano Banana';
            if (appSettings.provider === Provider.OPENAI) providerName = 'OpenAI';
            if (appSettings.provider === Provider.CUSTOM) providerName = 'OpenRouter';
            
            // Only update if changed to avoid unnecessary re-renders
            if (n.data.activeProvider !== providerName || n.data.provider !== appSettings.provider) {
                 return { 
                    ...n, 
                    data: { 
                        ...n.data, 
                        activeProvider: providerName,
                        provider: appSettings.provider,
                        globalModel: appSettings.imageModel 
                    } 
                };
            }
        }
        return n;
    }));
  }, [appSettings, setNodes]);

  const nodeTypes = useMemo(() => ({
    [NodeType.START]: StartNode,
    [NodeType.IMAGE]: ImageNode,
    [NodeType.VARIATION]: VariationNode,
    [NodeType.GRID]: GridNode,
    [NodeType.GROUP]: GroupNode,
  }), []);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ 
    ...params, 
    animated: true, 
    style: { stroke: '#52525b', strokeWidth: 2 } 
  }, eds)), [setEdges]);


  // --- Grouping Logic ---

  const handleCreateGroup = useCallback(() => {
    const selectedNodes = getNodes().filter(n => n.selected && n.type !== NodeType.GROUP && !n.parentNode);
    
    if (selectedNodes.length < 2) {
      alert("Select at least 2 nodes to group (must not be already grouped).");
      return;
    }

    const padding = 40;
    const minX = Math.min(...selectedNodes.map(n => n.position.x));
    const minY = Math.min(...selectedNodes.map(n => n.position.y));
    const maxX = Math.max(...selectedNodes.map(n => n.position.x + (n.width || 400)));
    const maxY = Math.max(...selectedNodes.map(n => n.position.y + (n.height || 400)));

    const groupWidth = (maxX - minX) + padding * 2;
    const groupHeight = (maxY - minY) + padding * 2;
    const groupX = minX - padding;
    const groupY = minY - padding;

    const groupId = `group-${Date.now()}`;
    const groupNode: Node<GroupNodeData> = {
      id: groupId,
      type: NodeType.GROUP,
      position: { x: groupX, y: groupY },
      style: { width: groupWidth, height: groupHeight },
      data: { 
          label: 'New Group', 
          width: groupWidth, 
          height: groupHeight,
          onUngroup: (id) => handleUngroupRef.current(id),
          onToggleCollapse: (id, c) => handleToggleCollapseRef.current(id, c)
      },
    };

    setNodes(nds => {
       const updatedNodes = nds.map(n => {
           if (selectedNodes.find(sn => sn.id === n.id)) {
               return {
                   ...n,
                   parentNode: groupId,
                   extent: 'parent',
                   position: {
                       x: n.position.x - groupX,
                       y: n.position.y - groupY
                   }
               };
           }
           return n;
       });
       return [...updatedNodes, groupNode];
    });

  }, [getNodes, setNodes]);

  const handleUngroup = useCallback((groupId: string) => {
      const allNodes = getNodes();
      const groupNode = allNodes.find(n => n.id === groupId);
      if (!groupNode) return;

      setNodes(nds => {
          return nds.reduce((acc, n) => {
              if (n.id === groupId) return acc;

              if (n.parentNode === groupId) {
                  return [...acc, {
                      ...n,
                      parentNode: undefined,
                      extent: undefined,
                      position: {
                          x: n.position.x + groupNode.position.x,
                          y: n.position.y + groupNode.position.y
                      },
                      hidden: false
                  }];
              }
              return [...acc, n];
          }, [] as Node[]);
      });
  }, [getNodes, setNodes]);

  const handleToggleCollapse = useCallback((groupId: string, collapsed: boolean) => {
      setNodes(nds => nds.map(n => n.id === groupId ? {
          ...n,
          style: {
              ...n.style,
              width: collapsed ? 200 : n.data.width,
              height: collapsed ? 40 : n.data.height,
          },
          data: { ...n.data, isCollapsed: collapsed }
      } : n.parentNode === groupId ? { ...n, hidden: collapsed } : n));
  }, [setNodes]);

  // --- Handlers ---

  const handleSuggestVariations = useCallback(async (category: string, count: number, context: string) => {
      return await getVariationSuggestions(context, category, count, appSettingsRef.current);
  }, []);

  const handleEnhancePrompt = useCallback(async (config: GenerationConfig) => {
      return await enhancePrompt(config, appSettingsRef.current);
  }, []);

  const handleBranch = useCallback((imageUrl: string, prompt: string, parentId: string) => {
    const currentNodes = getNodes();
    const parentNode = currentNodes.find(n => n.id === parentId);
    if (!parentNode) return;

    const newPos = findPositionForNewNode(currentNodes, parentNode);
    const newId = `img-branch-${Date.now()}`;

    const newNode: Node<ImageNodeData> = {
        id: newId,
        type: NodeType.IMAGE,
        position: newPos,
        data: {
            imageUrl,
            prompt,
            onAddVariation: (id) => handleAddVariationRef.current(id),
            onEdit: (id, p) => handleEditImageRef.current(id, p),
            generatedBy: 'Branch',
            loading: false
        }
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => addEdge({
        id: `e-${parentId}-${newId}`,
        source: parentId,
        target: newId,
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
    }, eds));

    setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
  }, [setNodes, setEdges, findPositionForNewNode, fitView, getNodes]);

  const handleRunVariation = useCallback(async (nodeId: string, config: VariationConfig) => {
     setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, loading: true } } : n));
     
     const currentNodes = getNodes();
     const variationNode = currentNodes.find(n => n.id === nodeId);
     if(!variationNode) return;

     let modelToUse = config.model; 

     const currentProvider = appSettingsRef.current.provider;
     
     const parentNode = currentNodes.find(n => n.id === variationNode.data.parentId);
     if (parentNode && parentNode.type === NodeType.IMAGE) {
         const parentModel = (parentNode.data as ImageNodeData).generatedBy;
         if (currentProvider === Provider.GOOGLE && parentModel) {
             modelToUse = parentModel;
         }
     }

     try {
        const promises = [];
        for(let i=0; i<config.prompts.length; i++) {
            const specificPrompt = config.prompts[i];
            const finalPrompt = `Change category: ${config.category}. Directive: ${specificPrompt}.`;
            promises.push(generateImageVariation(variationNode.data.parentImage, finalPrompt, modelToUse, appSettingsRef.current));
        }

        const results = await Promise.all(promises);

        const nodesAfterGen = getNodes();
        const freshVariationNode = nodesAfterGen.find(n => n.id === nodeId);
        if (!freshVariationNode) return;

        const startPos = findPositionForNewNode(nodesAfterGen, freshVariationNode);
        const gridId = `grid-${nodeId}-${Date.now()}`;
        
        const gridNode: Node<GridNodeData> = {
            id: gridId,
            type: NodeType.GRID,
            position: startPos,
            style: { width: 500, height: 500 },
            data: {
                images: results.map((url, idx) => ({
                    id: `img-${idx}`,
                    url,
                    prompt: config.prompts[idx] || `${config.category} Variation`
                })),
                parentId: nodeId,
                config,
                onBranch: (url, p, pid) => handleBranchRef.current(url, p, pid)
            }
        };

        setNodes(nds => {
            const loaded = nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, loading: false } } : n);
            return [...loaded, gridNode];
        });

        setEdges(eds => addEdge({
            id: `e-${nodeId}-${gridId}`,
            source: nodeId,
            target: gridId,
            animated: true,
            style: { stroke: '#52525b', strokeWidth: 2 }
        }, eds));
        
        setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);

     } catch (e) {
         console.error(e);
         const msg = e instanceof Error ? e.message : 'Unknown Error';
         alert(`Variation generation failed: ${msg}`);
         setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, loading: false } } : n));
     }
  }, [setNodes, setEdges, findPositionForNewNode, fitView, getNodes]);

  const handleEditImage = useCallback(async (nodeId: string, instructions: string) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, loading: true } } : n));
    
    const currentNodes = getNodes();
    const sourceNode = currentNodes.find(n => n.id === nodeId);
    if (!sourceNode || !sourceNode.data.imageUrl) {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, loading: false } } : n));
        return;
    }

    try {
        let modelToUse = 'gemini-2.5-flash-image';
        const currentProvider = appSettingsRef.current.provider;
        
        if (currentProvider === Provider.GOOGLE && sourceNode.data.generatedBy) {
            modelToUse = sourceNode.data.generatedBy;
        } else if (currentProvider !== Provider.GOOGLE) {
            modelToUse = appSettingsRef.current.imageModel || 'External';
        }

        const newImageUrl = await editGeneratedImage(
            sourceNode.data.imageUrl, 
            instructions, 
            modelToUse, 
            appSettingsRef.current
        );

        const nodesAfterGen = getNodes();
        const freshSourceNode = nodesAfterGen.find(n => n.id === nodeId);
        if (!freshSourceNode) return;

        const newPos = findPositionForNewNode(nodesAfterGen, freshSourceNode);
        const newImageId = `img-edit-${Date.now()}`;

        const newNode: Node<ImageNodeData> = {
            id: newImageId,
            type: NodeType.IMAGE,
            position: newPos,
            data: {
                imageUrl: newImageUrl,
                prompt: `Edited: ${instructions}`,
                onAddVariation: (id) => handleAddVariationRef.current(id),
                onEdit: (id, p) => handleEditImageRef.current(id, p),
                generatedBy: modelToUse,
                loading: false
            }
        };

        setNodes(nds => {
            const loaded = nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, loading: false } } : n);
            return [...loaded, newNode];
        });

        setEdges(eds => addEdge({
            id: `e-${nodeId}-${newImageId}`,
            source: nodeId,
            target: newImageId,
            animated: true,
            style: { stroke: '#a855f7', strokeWidth: 2 } 
        }, eds));

        setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);

    } catch (e) {
        console.error(e);
        alert(`Edit failed: ${e instanceof Error ? e.message : String(e)}`);
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, loading: false } } : n));
    }

  }, [setNodes, setEdges, findPositionForNewNode, fitView, getNodes]);

  const handleAddVariation = useCallback((parentId: string) => {
    setNodes(currentNodes => {
        const parentNode = currentNodes.find(n => n.id === parentId);
        if (!parentNode) return currentNodes;

        const variationId = `var-${Date.now()}`;
        
        let parentX = parentNode.position.x;
        let parentY = parentNode.position.y;
        
        if (parentNode.parentNode) {
            const p = currentNodes.find(n => n.id === parentNode.parentNode);
            if (p) {
               parentX += p.position.x;
               parentY += p.position.y;
            }
        }

        const gapX = 100;
        const targetX = parentX + (parentNode.width || NODE_WIDTH) + gapX;
        const targetY = parentY; 

        const variationNode: Node<VariationNodeData> = {
            id: variationId,
            type: NodeType.VARIATION,
            position: { x: targetX, y: targetY },
            data: {
                parentId,
                parentImage: parentNode.data.imageUrl!,
                parentPrompt: parentNode.data.prompt || '',
                onGenerate: handleRunVariation,
                onSuggest: handleSuggestRef.current
            }
        };
        
        setEdges((eds) => addEdge({
            id: `e-${parentId}-${variationId}`,
            source: parentId,
            target: variationId,
            style: { stroke: '#3b82f6', strokeWidth: 2 } 
        }, eds));

        return [...currentNodes, variationNode];
    });
  }, [setNodes, setEdges, handleRunVariation]);

  const handleInitialGenerate = useCallback(async (config: GenerationConfig, uploadedImage?: string) => {
    const startNodeId = 'start-1';
    
    setNodes((nds) => nds.map((node) => {
        if (node.id === startNodeId) {
            return { ...node, data: { ...node.data, loading: true } };
        }
        return node;
    }));

    try {
        let imageUrl: string;
        
        if (uploadedImage) {
           imageUrl = uploadedImage;
        } else {
           imageUrl = await generateImageFromConfig(config, appSettingsRef.current);
        }

        const currentNodes = getNodes();
        const startNode = currentNodes.find(n => n.id === startNodeId);
        if (!startNode) return;

        const newPos = findPositionForNewNode(currentNodes, startNode);
        const newImageNodeId = `img-${Date.now()}`;
        
        let generatedBy = config.model;
        if (appSettingsRef.current.provider !== Provider.GOOGLE) {
            generatedBy = appSettingsRef.current.imageModel || 'External Model';
        }
        
        const newImageNode: Node<ImageNodeData> = {
            id: newImageNodeId,
            type: NodeType.IMAGE,
            position: newPos,
            data: {
                imageUrl,
                prompt: config.prompt,
                config: config,
                onAddVariation: handleAddVariation,
                onEdit: handleEditImage, // Pass the handler
                loading: false,
                generatedBy: generatedBy
            }
        };

        setNodes((nds) => {
            const updated = nds.map(n => n.id === startNodeId ? { ...n, data: { ...n.data, loading: false } } : n);
            return [...updated, newImageNode];
        });

        setEdges((eds) => addEdge({
            id: `e-${startNodeId}-${newImageNodeId}`,
            source: startNodeId,
            target: newImageNodeId,
            animated: true,
            style: { stroke: '#52525b', strokeWidth: 2 } 
        }, eds));
        
        setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);

    } catch (error) {
        console.error(error);
        const msg = error instanceof Error ? error.message : "Unknown Error";
        alert(`Failed to generate: ${msg}`);
        setNodes((nds) => nds.map((node) => {
            if (node.id === startNodeId) {
                return { ...node, data: { ...node.data, loading: false } };
            }
            return node;
        }));
    }
  }, [setNodes, setEdges, findPositionForNewNode, fitView, handleAddVariation, handleEditImage, getNodes]);

  useEffect(() => {
    handleAddVariationRef.current = handleAddVariation;
    handleBranchRef.current = handleBranch;
    handleUngroupRef.current = handleUngroup;
    handleToggleCollapseRef.current = handleToggleCollapse;
    handleSuggestRef.current = handleSuggestVariations;
    handleEnhanceRef.current = handleEnhancePrompt;
    handleEditImageRef.current = handleEditImage;
  }, [handleAddVariation, handleBranch, handleUngroup, handleToggleCollapse, handleSuggestVariations, handleEnhancePrompt, handleEditImage]);

  // --- RE-ATTACH CALLBACKS ON LOAD ---
  // When loading from JSON/LocalStorage, the data object loses its functions.
  // This effect ensures that all nodes have their event handlers attached.
  useEffect(() => {
    setNodes((nds) => nds.map(n => {
        const common = { ...n };
        
        // Skip update if callbacks are already present to avoid infinite loops,
        // unless we forced a reload.
        if (n.type === NodeType.START) {
             return { ...common, data: { ...common.data, onGenerate: handleInitialGenerate, onEnhancePrompt: handleEnhancePrompt } };
        }
        if (n.type === NodeType.IMAGE) {
             return { ...common, data: { ...common.data, onAddVariation: handleAddVariation, onEdit: handleEditImage } };
        }
        if (n.type === NodeType.VARIATION) {
             return { ...common, data: { ...common.data, onGenerate: handleRunVariation, onSuggest: handleSuggestVariations } };
        }
        if (n.type === NodeType.GRID) {
             return { ...common, data: { ...common.data, onBranch: handleBranch } };
        }
        if (n.type === NodeType.GROUP) {
             return { ...common, data: { ...common.data, onUngroup: handleUngroup, onToggleCollapse: handleToggleCollapse } };
        }
        return n;
    }));
  }, [
      // Dependencies: If any handler identity changes, re-bind them to all nodes
      handleInitialGenerate, handleAddVariation, handleRunVariation, 
      handleBranch, handleUngroup, handleToggleCollapse, 
      handleSuggestVariations, handleEnhancePrompt, handleEditImage, 
      setNodes
  ]);


  const handleLoadProject = () => {
      const data = loadFromStorage();
      if (data) {
          setNodes(data.nodes);
          setEdges(data.edges);
          setTimeout(() => fitView({ padding: 0.2 }), 100);
      }
  };
  
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          importFromJson(file, (newNodes, newEdges) => {
              setNodes(newNodes);
              setEdges(newEdges);
              setTimeout(() => fitView({ padding: 0.2 }), 100);
          });
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };


  return (
    <div className="w-full h-screen bg-background relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        selectionOnDrag
        panOnScroll
        className="bg-background"
      >
        <Background color="#27272a" gap={24} size={1} variant={BackgroundVariant.Dots} />
        <Controls className="bg-surface border border-border rounded-lg overflow-hidden shadow-xl" />
        
        <Panel position="top-right" className="flex gap-2">
           <button 
             onClick={handleCreateGroup}
             className="px-3 py-1.5 bg-surface border border-border text-zinc-300 rounded hover:bg-zinc-800 text-xs font-medium flex items-center gap-2 shadow-lg"
             title="Group Selected Nodes"
           >
             <Layers className="w-4 h-4" />
             Group
           </button>

           <div className="h-8 w-px bg-zinc-700 mx-1"></div>

           <button 
             onClick={saveToStorage}
             className="px-3 py-1.5 bg-surface border border-border text-zinc-300 rounded hover:bg-zinc-800 text-xs font-medium flex items-center gap-2 shadow-lg"
             title="Save to Browser Storage"
           >
             <Save className="w-4 h-4" />
           </button>
           
           <button 
             onClick={handleLoadProject}
             className="px-3 py-1.5 bg-surface border border-border text-zinc-300 rounded hover:bg-zinc-800 text-xs font-medium flex items-center gap-2 shadow-lg"
             title="Load from Browser Storage"
           >
             <HardDrive className="w-4 h-4" />
           </button>

           <button 
             onClick={exportToJson}
             className="px-3 py-1.5 bg-surface border border-border text-zinc-300 rounded hover:bg-zinc-800 text-xs font-medium flex items-center gap-2 shadow-lg"
             title="Download Project JSON"
           >
             <Download className="w-4 h-4" />
           </button>

           <button 
             onClick={() => fileInputRef.current?.click()}
             className="px-3 py-1.5 bg-surface border border-border text-zinc-300 rounded hover:bg-zinc-800 text-xs font-medium flex items-center gap-2 shadow-lg"
             title="Import Project JSON"
           >
             <Upload className="w-4 h-4" />
           </button>
           
           <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json" 
              onChange={handleImportFile}
           />

           <div className="h-8 w-px bg-zinc-700 mx-1"></div>

           <button 
             onClick={() => setShowSettings(true)}
             className="px-3 py-1.5 bg-surface border border-border text-zinc-300 rounded hover:bg-zinc-800 text-xs font-medium flex items-center gap-2 shadow-lg"
           >
             <Settings className="w-4 h-4" />
             Settings
           </button>
        </Panel>
      </ReactFlow>
      
      <div className="absolute top-6 left-6 pointer-events-none">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-3 h-8 bg-yellow-400 rounded-full block rotate-12"></span>
            Nano Banana <span className="text-zinc-500 font-normal">Storyboarder</span>
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Node-based Generative AI Workflow</p>
      </div>

      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-5 duration-300">
           <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 font-medium">
              <CheckCircle2 className="w-5 h-5" />
              {notification}
           </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
             <div className="p-4 border-b border-border flex justify-between items-center bg-zinc-900/50">
                <h3 className="font-bold text-white flex items-center gap-2">
                   <Settings className="w-5 h-5" /> Global Settings
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-white">
                   <X className="w-5 h-5" />
                </button>
             </div>
             
             <div className="p-6 space-y-6">
                <div>
                   <label className="block text-sm font-medium text-zinc-400 mb-2">Image Generation Provider</label>
                   <div className="grid grid-cols-3 gap-2">
                      {[Provider.GOOGLE, Provider.OPENAI, Provider.CUSTOM].map(p => (
                         <button
                           key={p}
                           onClick={() => setAppSettings(prev => {
                               let newImgModel = prev.imageModel;
                               let newTxtModel = prev.textModel;

                               if (p === Provider.OPENAI) {
                                   newImgModel = 'dall-e-3'; 
                                   newTxtModel = 'gpt-4o';
                               }
                               if (p === Provider.CUSTOM) {
                                   newImgModel = 'google/gemini-3-pro-image-preview';
                                   newTxtModel = 'google/gemini-2.5-flash';
                               }
                               
                               // Load key for this provider from storage dictionary
                               const restoredKey = prev.keys[p] || '';

                               return { 
                                   ...prev, 
                                   provider: p,
                                   apiKey: restoredKey, // Set active key
                                   imageModel: newImgModel,
                                   textModel: newTxtModel 
                                };
                           })}
                           className={`py-2 px-3 rounded-lg text-xs font-bold uppercase transition-all border ${
                              appSettings.provider === p 
                                ? 'bg-accent/20 border-accent text-accent' 
                                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                           }`}
                         >
                           {p === Provider.GOOGLE ? 'Nano Banana' : p === Provider.CUSTOM ? 'OpenRouter' : p}
                         </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-4 animate-in slide-in-from-top-2">
                    <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg flex gap-3 items-start">
                        <AlertCircle className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-zinc-400">
                            Settings are saved per-provider automatically.
                        </p>
                    </div>
                    
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-zinc-400">
                                {appSettings.provider === Provider.GOOGLE ? 'Google AI Studio Key' : 
                                 appSettings.provider === Provider.OPENAI ? 'OpenAI API Key' : 
                                 'OpenRouter API Key'}
                            </label>
                            <span className={`text-[10px] flex items-center gap-1 font-medium transition-colors ${isSaving ? 'text-zinc-500' : 'text-green-500'}`}>
                                {isSaving ? 'Saving...' : 'Saved'} 
                                {!isSaving && <CheckCircle2 className="w-3 h-3" />}
                            </span>
                        </div>
                        <input 
                            type="password" 
                            value={appSettings.apiKey}
                            onChange={(e) => {
                                const newVal = e.target.value;
                                setAppSettings(prev => ({ 
                                    ...prev, 
                                    apiKey: newVal, // Update Active
                                    keys: { ...prev.keys, [prev.provider]: newVal } // Update Storage
                                }));
                            }}
                            placeholder={appSettings.provider === Provider.GOOGLE ? "Leave empty to use default env key" : "sk-..."}
                            className="w-full bg-zinc-950 border border-border rounded-lg p-2.5 text-sm text-white focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                        />
                    </div>

                    {appSettings.provider !== Provider.GOOGLE && (
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Image Model</label>
                                <input 
                                    type="text" 
                                    value={appSettings.imageModel || ''}
                                    onChange={(e) => setAppSettings(prev => ({ ...prev, imageModel: e.target.value }))}
                                    placeholder="google/gemini-3-pro-image-preview"
                                    className="w-full bg-zinc-950 border border-border rounded-lg p-2.5 text-sm text-white focus:border-accent focus:ring-1 focus:ring-accent outline-none placeholder-zinc-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Text/Suggestion Model</label>
                                <input 
                                    type="text" 
                                    value={appSettings.textModel || ''}
                                    onChange={(e) => setAppSettings(prev => ({ ...prev, textModel: e.target.value }))}
                                    placeholder="google/gemini-2.5-flash"
                                    className="w-full bg-zinc-950 border border-border rounded-lg p-2.5 text-sm text-white focus:border-accent focus:ring-1 focus:ring-accent outline-none placeholder-zinc-700"
                                />
                            </div>
                        </div>
                    )}
                </div>
             </div>

             <div className="p-4 bg-zinc-900/50 border-t border-border flex justify-end">
                <button 
                  onClick={() => {
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(appSettings));
                      setNotification("Settings Saved to Local Storage");
                      setShowSettings(false);
                  }}
                  className="px-6 py-2 bg-accent hover:bg-blue-600 text-white font-bold rounded-lg transition-colors text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Save className="w-4 h-4" />
                  Save & Close
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function StoryboardFlow() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}