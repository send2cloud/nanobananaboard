import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { 
  Image as ImageIcon, 
  Upload, 
  Wand2, 
  MoreHorizontal, 
  Camera, 
  BookOpen, 
  Trees, 
  Palette, 
  Plus, 
  Play,
  Loader2,
  Download,
  Settings2,
  ChevronDown,
  ChevronUp,
  X,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Maximize2,
  FolderOpen,
  FolderClosed,
  Unlink,
  Server,
  Zap,
  Box,
  Sparkles,
  Pencil
} from 'lucide-react';
import { 
  StartNodeData, 
  ImageNodeData, 
  VariationNodeData, 
  GridNodeData,
  GroupNodeData,
  VariationCategory, 
  MODEL_OPTIONS,
  ASPECT_RATIOS,
  STYLES,
  SHOT_TYPES,
  CAMERA_ANGLES,
  LIGHTING_OPTS,
  GenerationConfig,
  Provider
} from '../types';

// --- Helper Components ---

type NodeWrapperProps = {
  children?: React.ReactNode;
  selected?: boolean;
  title?: string;
  width?: string;
  className?: string;
  headerClassName?: string;
};

const NodeWrapper = ({ children, selected, title, width = "w-[340px]", className = "", headerClassName = "" }: NodeWrapperProps) => (
  <div className={`relative group rounded-xl bg-surface border-2 transition-all duration-200 ${width} shadow-lg ${selected ? 'border-accent shadow-accent/20' : 'border-border hover:border-zinc-600'} ${className}`}>
    {title && (
      <div className={`px-4 py-2 border-b border-border bg-zinc-900/50 rounded-t-xl flex items-center justify-between ${headerClassName}`}>
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</span>
        <MoreHorizontal className="w-4 h-4 text-zinc-600" />
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

// --- START NODE ---

export const StartNode: React.FC<NodeProps<StartNodeData>> = ({ data, selected }) => {
  const [prompt, setPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'upload'>('text');
  
  // Configuration State
  const [model, setModel] = useState(MODEL_OPTIONS.FLASH);
  // Default to 16:9 as requested
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS.find(r => r.value === '16:9')?.value || '16:9');
  const [style, setStyle] = useState(STYLES[0].value);
  const [shotType, setShotType] = useState<string>('');
  const [cameraAngle, setCameraAngle] = useState<string>('');
  const [lighting, setLighting] = useState<string>('');

  const [showConfig, setShowConfig] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGoogle = !data.provider || data.provider === Provider.GOOGLE;

  const handleGenerate = () => {
    if (!prompt.trim() && activeTab === 'text') return;
    
    const config: GenerationConfig = {
      model: isGoogle ? model : (data.globalModel || 'External'), // Use local selection only if Google
      aspectRatio,
      style,
      shotType,
      cameraAngle,
      lighting,
      prompt: activeTab === 'text' ? prompt : "Uploaded Image Variation",
    };
    
    data.onGenerate(config);
  };

  const handleMagicEnhance = async () => {
    if (!prompt.trim() || !data.onEnhancePrompt) return;
    setIsEnhancing(true);
    try {
        const config: GenerationConfig = {
            model: isGoogle ? model : (data.globalModel || 'External'),
            aspectRatio,
            style,
            shotType,
            cameraAngle,
            lighting,
            prompt
        };
        const enhanced = await data.onEnhancePrompt(config);
        setPrompt(enhanced);
    } catch (e) {
        console.error("Enhancement failed", e);
    } finally {
        setIsEnhancing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
         const config: GenerationConfig = {
            model: isGoogle ? model : (data.globalModel || 'External'),
            aspectRatio, 
            style: 'Varied',
            prompt: 'Uploaded Image',
         };
         data.onGenerate(config, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <NodeWrapper selected={selected} title="Story Board Generator" width="w-[400px]">
      <div className="flex space-x-1 mb-4 p-1 bg-zinc-900 rounded-lg border border-border">
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${activeTab === 'text' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Text Prompt
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${activeTab === 'upload' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Image Upload
        </button>
      </div>

      {activeTab === 'text' ? (
        <div className="space-y-4">
          <div className="relative">
              <textarea
                className={`w-full bg-zinc-950 border border-border rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none h-32 pr-8 custom-scrollbar ${isEnhancing ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder="Describe your shot (e.g., A cyberpunk detective in neon rain)..."
                value={prompt}
                disabled={isEnhancing}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button 
                  onClick={handleMagicEnhance}
                  disabled={!prompt.trim() || isEnhancing || !data.onEnhancePrompt}
                  className="absolute bottom-3 right-3 p-1.5 rounded-md text-zinc-500 hover:text-indigo-400 hover:bg-zinc-900 transition-all disabled:opacity-30 disabled:hover:text-zinc-500"
                  title="Enhance Prompt with Magic"
              >
                  {isEnhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              </button>
          </div>

          {/* Configuration Accordion */}
          <div className="border border-border rounded-lg overflow-hidden bg-zinc-900/30">
            <button 
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                 <Settings2 className="w-3.5 h-3.5" />
                 <span>Configuration</span>
                 {!showConfig && (
                   <span className="text-[10px] text-zinc-600 ml-2 font-normal">
                     {aspectRatio} • {isGoogle ? (model.includes('flash') ? 'Flash' : 'Pro') : 'External'}
                   </span>
                 )}
              </div>
              {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showConfig && (
              <div className="p-3 border-t border-border space-y-4 animate-in slide-in-from-top-1 duration-200">
                 
                 {/* Model Selection - CONDITIONAL */}
                 <div>
                    <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1.5 block">Model</label>
                    {isGoogle ? (
                        <select 
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className="w-full bg-zinc-950 border border-border rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
                        >
                          <option value={MODEL_OPTIONS.FLASH}>Gemini 2.5 Flash (Fast)</option>
                          <option value={MODEL_OPTIONS.PRO}>Gemini 3 Pro (High Quality)</option>
                        </select>
                    ) : (
                        <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-400 flex items-center gap-2 cursor-not-allowed">
                             <Box className="w-3 h-3" />
                             <span className="truncate">{data.globalModel || 'Using Global Setting'}</span>
                        </div>
                    )}
                 </div>

                 {/* Aspect Ratio */}
                 <div>
                   <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1.5 block">Aspect Ratio</label>
                   <div className="grid grid-cols-5 gap-1">
                     {ASPECT_RATIOS.map(ar => (
                       <button
                         key={ar.value}
                         onClick={() => setAspectRatio(ar.value)}
                         className={`py-1.5 text-[10px] rounded border transition-all ${
                           aspectRatio === ar.value 
                             ? 'bg-accent/10 border-accent text-accent font-medium' 
                             : 'bg-zinc-900 border-transparent text-zinc-400 hover:bg-zinc-800'
                         }`}
                       >
                         {ar.label}
                       </button>
                     ))}
                   </div>
                 </div>

                 {/* Style */}
                 <div>
                   <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1.5 block">Artistic Style</label>
                   <div className="flex flex-wrap gap-1.5">
                     {STYLES.map(s => (
                       <button
                         key={s.label}
                         onClick={() => setStyle(s.value)}
                         className={`px-2 py-1 text-[10px] rounded-full border transition-all ${
                           style === s.value
                             ? 'bg-zinc-200 text-black border-zinc-200 font-bold' 
                             : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500'
                         }`}
                       >
                         {s.label}
                       </button>
                     ))}
                   </div>
                 </div>

                 {/* Advanced Details */}
                 <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                    <div>
                       <label className="text-[10px] text-zinc-500 block mb-1">Shot Type</label>
                       <select value={shotType} onChange={(e) => setShotType(e.target.value)} className="w-full bg-zinc-950 border-border rounded p-1 text-xs text-zinc-400 outline-none"><option value="">None</option>{SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    </div>
                    <div>
                       <label className="text-[10px] text-zinc-500 block mb-1">Camera Angle</label>
                       <select value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)} className="w-full bg-zinc-950 border-border rounded p-1 text-xs text-zinc-400 outline-none"><option value="">None</option>{CAMERA_ANGLES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    </div>
                    <div className="col-span-2">
                       <label className="text-[10px] text-zinc-500 block mb-1">Lighting</label>
                       <select value={lighting} onChange={(e) => setLighting(e.target.value)} className="w-full bg-zinc-950 border-border rounded p-1 text-xs text-zinc-400 outline-none"><option value="">None</option>{LIGHTING_OPTS.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    </div>
                 </div>
              </div>
            )}
          </div>
          
          {/* Active Provider Indicator */}
          <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1">
             <div className="flex items-center gap-1.5">
               <Server className="w-3 h-3" />
               <span>Using: <span className="text-zinc-300 font-medium">{data.activeProvider || 'Nano Banana'}</span></span>
             </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={data.loading || !prompt}
            className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-white/5"
          >
            {data.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Generate
          </button>
        </div>
      ) : (
        <div 
          className="border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-zinc-500 hover:border-zinc-500 hover:bg-zinc-900/50 transition-colors cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3 group-hover:bg-zinc-800 transition-colors">
             <Upload className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium text-zinc-400">Click to upload source</span>
          <span className="text-xs text-zinc-600 mt-1">Supports PNG, JPG</span>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileUpload}
          />
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-accent !w-3 !h-3 !border-4 !border-surface" />
    </NodeWrapper>
  );
};

// --- IMAGE NODE ---

export const ImageNode: React.FC<NodeProps<ImageNodeData>> = ({ id, data, selected }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');

  // Logic to display model name nicely
  let modelLabel = 'Nano Flash';
  let badgeColor = 'bg-green-500';

  if (data.generatedBy) {
      const low = data.generatedBy.toLowerCase();
      if (low.includes('pro')) {
          modelLabel = 'Nano Pro';
          badgeColor = 'bg-purple-500';
      } else if (low.includes('dall')) {
          modelLabel = 'DALL-E';
          badgeColor = 'bg-blue-500';
      } else if (low.includes('flash')) {
          modelLabel = 'Nano Flash';
          badgeColor = 'bg-green-500';
      } else {
          // Truncate long external IDs
          modelLabel = data.generatedBy.split('/').pop()?.slice(0, 10) || 'External';
          badgeColor = 'bg-orange-500';
      }
  }

  // Handle ESC key to close lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);

  const handleRunEdit = () => {
    if (!editPrompt.trim() || !data.onEdit) return;
    data.onEdit(id, editPrompt);
    setIsEditing(false);
    setEditPrompt('');
  };

  return (
    <>
    <div className={`relative group rounded-2xl overflow-hidden bg-black border-2 transition-all duration-300 w-[320px] shadow-2xl ${selected ? 'border-accent shadow-accent/20' : 'border-zinc-800'}`}>
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-3 !h-3 !border-4 !border-black" />
      
      {/* Header Info */}
      {data.config && !isEditing && (
         <div className="absolute top-0 left-0 right-0 p-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start pointer-events-none">
            <div className="flex gap-1">
               <span className="px-1.5 py-0.5 rounded bg-black/50 backdrop-blur text-[9px] text-white border border-white/10 uppercase">{data.config.aspectRatio}</span>
               {modelLabel !== 'Nano Flash' && <span className={`px-1.5 py-0.5 rounded ${badgeColor}/20 text-white border ${badgeColor}/30 text-[9px] uppercase`}>{modelLabel}</span>}
            </div>
         </div>
      )}

      {/* Main Content Area: Either Image or Edit Input */}
      <div 
        className={`relative bg-zinc-900 flex items-center justify-center ${data.config?.aspectRatio === '9:16' ? 'aspect-[9/16]' : data.config?.aspectRatio === '16:9' ? 'aspect-video' : data.config?.aspectRatio === '4:3' ? 'aspect-[4/3]' : data.config?.aspectRatio === '3:4' ? 'aspect-[3/4]' : 'aspect-square'}`}
        onClick={() => !data.loading && !isEditing && data.imageUrl && setLightboxOpen(true)}
      >
        {isEditing ? (
           <div className="absolute inset-0 bg-zinc-900 p-4 flex flex-col z-20" onClick={(e) => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase">Edit Instructions</span>
                  <button onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4"/></button>
               </div>
               <textarea 
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-3 text-sm text-zinc-200 resize-none focus:outline-none focus:border-accent"
                  placeholder="e.g. Change the car to a helicopter..."
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  autoFocus
               />
               <button 
                  onClick={handleRunEdit}
                  disabled={!editPrompt.trim()}
                  className="mt-3 w-full py-2 bg-accent hover:bg-blue-600 text-white font-bold rounded text-xs transition-colors disabled:opacity-50"
               >
                  Run Edit
               </button>
           </div>
        ) : (
            data.loading ? (
                <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    <span className="text-xs font-mono uppercase tracking-widest">Generating...</span>
                </div>
            ) : data.imageUrl ? (
                <>
                    <img src={data.imageUrl} alt="Generated" className={`w-full h-full object-cover ${!isEditing ? 'cursor-zoom-in' : ''}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 pointer-events-none">
                        <p className="text-white text-xs line-clamp-3 mb-3 font-light">{data.prompt}</p>
                        <div className="flex items-center gap-2 pointer-events-auto">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                const link = document.createElement('a');
                                link.href = data.imageUrl!;
                                link.download = `nano-banana-${id}.png`;
                                link.click();
                            }}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
                            title="Download"
                            >
                            <Download className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setLightboxOpen(true);
                            }}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
                            title="Expand"
                            >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                        </div>
                    </div>
                </>
            ) : (
                <span className="text-zinc-700">No Image</span>
            )
        )}
      </div>

      {!data.loading && data.imageUrl && !isEditing && (
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex justify-between items-center">
            <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${badgeColor}`}></div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  {modelLabel}
                </span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                    title="Edit Image"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => data.onAddVariation && data.onAddVariation(id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300 transition-colors"
                >
                    <Plus className="w-3 h-3" />
                    Variations
                </button>
            </div>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-accent !w-3 !h-3 !border-4 !border-black" />
    </div>

    {/* SINGLE IMAGE LIGHTBOX */}
    {lightboxOpen && data.imageUrl && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200">
           {/* Close Button */}
           <button 
             onClick={() => setLightboxOpen(false)} 
             className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50"
           >
              <X className="w-6 h-6" />
           </button>

           {/* Main Content - Fill Viewport */}
           <div className="w-full h-full p-8 flex flex-col items-center justify-center">
              <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden">
                 <img 
                    src={data.imageUrl} 
                    alt="Lightbox View" 
                    className="max-w-full max-h-full object-contain drop-shadow-2xl" 
                 />
              </div>

              {/* Simple Footer */}
              <div className="mt-6 flex items-center gap-6 shrink-0">
                 <p className="text-sm text-zinc-400 max-w-lg truncate text-center">{data.prompt}</p>
                 <div className="h-4 w-px bg-zinc-800"></div>
                 <button 
                    onClick={() => {
                        data.onAddVariation && data.onAddVariation(id);
                        setLightboxOpen(false);
                    }}
                    className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-full flex items-center gap-2 transition-colors"
                 >
                    <GitBranch className="w-4 h-4" />
                    Variations
                 </button>
              </div>
           </div>
        </div>,
        document.body
    )}
    </>
  );
};

// --- GRID NODE (Pinterest Style) ---

export const GridNode: React.FC<NodeProps<GridNodeData>> = ({ id, data, selected }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const nextImage = useCallback(() => {
    setLightboxIndex((prev) => (prev + 1) % data.images.length);
  }, [data.images.length]);

  const prevImage = useCallback(() => {
    setLightboxIndex((prev) => (prev - 1 + data.images.length) % data.images.length);
  }, [data.images.length]);

  // Keyboard Navigation
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, nextImage, prevImage]);

  const currentImage = data.images[lightboxIndex];

  return (
    <>
      <NodeResizer 
         color="#3b82f6" 
         isVisible={selected} 
         minWidth={300} 
         minHeight={300} 
      />
      
      <div className={`relative w-full h-full bg-surface/50 backdrop-blur-sm rounded-2xl border-2 overflow-hidden flex flex-col ${selected ? 'border-accent shadow-accent/20' : 'border-zinc-800'}`}>
        {/* Header */}
        <div className="px-4 py-2 bg-zinc-900/80 border-b border-border flex items-center justify-between shrink-0">
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                 {data.config?.category} Variations
              </span>
           </div>
           <span className="text-[10px] text-zinc-500">{data.images.length} images</span>
        </div>

        {/* Masonry Grid Content */}
        <div className="p-3 flex-1 overflow-y-auto no-scrollbar">
           <div className="columns-2 gap-3 space-y-3">
              {data.images.map((img, idx) => (
                 <div 
                   key={idx} 
                   className="break-inside-avoid relative group rounded-lg overflow-hidden cursor-zoom-in bg-black border border-zinc-800 hover:border-zinc-600 transition-all"
                   onClick={() => openLightbox(idx)}
                 >
                    <img src={img.url} alt={`Var ${idx}`} className="w-full h-auto object-cover block" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <Maximize2 className="w-5 h-5 text-white drop-shadow-lg" />
                    </div>
                 </div>
              ))}
           </div>
        </div>

        <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-3 !h-3 !border-4 !border-black" />
        <Handle type="source" position={Position.Right} className="!bg-accent !w-3 !h-3 !border-4 !border-black" />
      </div>

      {/* LIGHTBOX PORTAL (GRID) */}
      {lightboxOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200">
           {/* Close Button */}
           <button onClick={closeLightbox} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50">
              <X className="w-6 h-6" />
           </button>

           {/* Main Content - FILL VIEWPORT */}
           <div className="w-full h-full p-8 flex flex-col items-center justify-center relative">
              
              {/* Image Container - Maximized */}
              <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden relative">
                 <img 
                    src={currentImage.url} 
                    alt="Lightbox View" 
                    className="max-w-full max-h-full object-contain drop-shadow-2xl" 
                 />
                 
                 {/* Navigation Buttons (Floating Next to Image) */}
                 <button onClick={prevImage} className="absolute left-4 md:left-10 p-4 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white transition-colors backdrop-blur-md">
                    <ChevronLeft className="w-8 h-8" />
                 </button>
                 <button onClick={nextImage} className="absolute right-4 md:right-10 p-4 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white transition-colors backdrop-blur-md">
                    <ChevronRight className="w-8 h-8" />
                 </button>
              </div>

              {/* Footer Controls */}
              <div className="mt-4 flex items-center gap-6 shrink-0 z-50">
                 <div className="text-center">
                    <p className="text-sm text-zinc-400 font-mono mb-1">{lightboxIndex + 1} / {data.images.length}</p>
                    <p className="text-xs text-zinc-600 max-w-md truncate">{currentImage.prompt}</p>
                 </div>
                 
                 <div className="h-8 w-px bg-zinc-800"></div>

                 <button 
                    onClick={() => {
                       data.onBranch(currentImage.url, currentImage.prompt, id);
                       closeLightbox();
                    }}
                    className="px-6 py-2 bg-accent hover:bg-blue-600 text-white font-bold rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                 >
                    <GitBranch className="w-4 h-4" />
                    Continue Story
                 </button>
              </div>
           </div>
        </div>,
        document.body
      )}
    </>
  );
};

// --- VARIATION NODE ---

const CATEGORIES = [
  { id: VariationCategory.CAMERA, icon: Camera, label: 'Camera' },
  { id: VariationCategory.NARRATIVE, icon: BookOpen, label: 'Story' },
  { id: VariationCategory.ENVIRONMENT, icon: Trees, label: 'Env' },
  { id: VariationCategory.STYLE, icon: Palette, label: 'Style' },
];

export const VariationNode: React.FC<NodeProps<VariationNodeData>> = ({ id, data, selected }) => {
  const [category, setCategory] = useState<VariationCategory>(VariationCategory.CAMERA);
  const [count, setCount] = useState(4); 
  // Store prompts for each variation. Default to empty strings or pre-filled generic
  const [prompts, setPrompts] = useState<string[]>(Array(4).fill(''));
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Update prompt array size when count changes
  useEffect(() => {
    setPrompts(prev => {
        const newArr = Array(count).fill('');
        for(let i=0; i < Math.min(prev.length, count); i++) {
            newArr[i] = prev[i];
        }
        return newArr;
    });
  }, [count]);

  const handleRun = () => {
    // Fill empty prompts with generic fallback if user didn't type anything
    const finalPrompts = prompts.map((p, i) => p.trim() || `${category} Variation ${i+1}`);
    data.onGenerate(id, {
      category,
      prompts: finalPrompts,
      model: 'Inherit' 
    });
  };

  const handleMagicSuggest = async () => {
     if (!data.onSuggest) return;
     setIsSuggesting(true);
     try {
         const suggestions = await data.onSuggest(category, count, data.parentPrompt || '');
         // Fill prompts with suggestions, padding with empty if needed
         setPrompts(prev => {
             const newPrompts = [...prev];
             suggestions.forEach((s, i) => {
                 if (i < newPrompts.length) newPrompts[i] = s;
             });
             return newPrompts;
         });
     } catch (e) {
         console.error("Suggestion failed", e);
     } finally {
         setIsSuggesting(false);
     }
  };

  const updatePrompt = (index: number, text: string) => {
      const newPrompts = [...prompts];
      newPrompts[index] = text;
      setPrompts(newPrompts);
  };

  return (
    <NodeWrapper selected={selected} title="Configuration" width="w-[380px]">
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-3 !h-3 !border-4 !border-surface" />
      
      {/* Category Selector */}
      <div className="grid grid-cols-4 gap-1 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
              category === cat.id 
                ? 'bg-accent/10 text-accent ring-1 ring-accent' 
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            }`}
          >
            <cat.icon className="w-4 h-4 mb-1" />
            <span className="text-[10px] font-medium">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Controls: Count & Magic */}
      <div className="flex items-center justify-between mb-3 px-1">
         <div className="flex items-center gap-2 bg-zinc-950 rounded-md p-1 border border-border">
             <button 
                onClick={() => setCount(Math.max(1, count - 1))}
                className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
             >-</button>
             <span className="text-xs font-mono w-4 text-center text-zinc-300">{count}</span>
             <button 
                onClick={() => setCount(Math.min(8, count + 1))}
                className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
             >+</button>
         </div>

         <button 
            onClick={handleMagicSuggest}
            disabled={isSuggesting}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-md text-[10px] font-bold uppercase tracking-wide transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
         >
            {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 fill-current" />}
            Suggest
         </button>
      </div>

      {/* Dynamic Input List */}
      <div className="space-y-2 mb-4 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
         {prompts.map((p, idx) => (
             <div key={idx} className="relative group">
                 <span className="absolute left-3 top-2.5 text-[10px] text-zinc-600 font-mono">{idx + 1}</span>
                 <input
                    value={p}
                    onChange={(e) => updatePrompt(idx, e.target.value)}
                    placeholder={`Variation ${idx + 1}...`}
                    className="w-full bg-zinc-950/50 border border-border rounded-md py-2 pl-7 pr-2 text-xs text-zinc-300 focus:outline-none focus:border-accent focus:bg-zinc-950 transition-colors placeholder-zinc-700"
                 />
             </div>
         ))}
      </div>

      {/* Footer Run Button */}
      <div className="pt-2 border-t border-border">
         <button
            onClick={handleRun}
            disabled={data.loading}
            className="w-full py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
         >
            {data.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
            Generate All
         </button>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-accent !w-3 !h-3 !border-4 !border-surface" />
    </NodeWrapper>
  );
};

// --- GROUP NODE ---

export const GroupNode: React.FC<NodeProps<GroupNodeData>> = ({ id, data, selected }) => {
  const isCollapsed = data.isCollapsed;

  return (
    <>
      {!isCollapsed && (
        <NodeResizer 
          color="#3b82f6" 
          isVisible={selected} 
          minWidth={200} 
          minHeight={100}
        />
      )}
      
      <div 
        className={`relative rounded-xl border-2 transition-all duration-200 
          ${selected ? 'border-accent/50 shadow-accent/10' : 'border-zinc-700/50'} 
          ${isCollapsed ? 'bg-surface shadow-lg' : 'bg-zinc-900/20 backdrop-blur-[2px]'}
        `}
        style={{
          width: isCollapsed ? 200 : '100%',
          height: isCollapsed ? 50 : '100%',
        }}
      >
        {/* Group Header */}
        <div className={`
            absolute top-0 left-0 right-0 h-10 px-3 flex items-center justify-between
            bg-zinc-800/80 rounded-t-xl border-b border-white/5
            ${isCollapsed ? 'rounded-b-xl border-b-0' : ''}
        `}>
           <div className="flex items-center gap-2 overflow-hidden">
               {isCollapsed ? <FolderClosed className="w-4 h-4 text-zinc-400" /> : <FolderOpen className="w-4 h-4 text-zinc-400" />}
               <span className="text-xs font-bold text-zinc-300 truncate">{data.label || 'Group'}</span>
           </div>
           
           <div className="flex items-center gap-1">
              <button 
                 onClick={() => data.onUngroup && data.onUngroup(id)}
                 className="p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-red-400 transition-colors"
                 title="Ungroup"
              >
                 <Unlink className="w-3.5 h-3.5" />
              </button>
              <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    data.onToggleCollapse && data.onToggleCollapse(id, !isCollapsed);
                 }}
                 className="p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-white transition-colors"
              >
                 {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
           </div>
        </div>
      </div>
    </>
  );
};