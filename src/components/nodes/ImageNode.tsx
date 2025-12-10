import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { Loader2, Download, Maximize2, X, Pencil, Plus, GitBranch, Heart } from 'lucide-react';
import { ImageNodeData } from '../../types';

export const ImageNode: React.FC<NodeProps<ImageNodeData>> = ({ id, data, selected }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');

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
          modelLabel = data.generatedBy.split('/').pop()?.slice(0, 10) || 'External';
          badgeColor = 'bg-orange-500';
      }
  }

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

  const handleDownload = () => {
    if (!data.imageUrl) return;
    const link = document.createElement('a');
    link.href = data.imageUrl;
    // Use prompt slug in filename if possible
    const slug = data.prompt ? data.prompt.slice(0, 20).replace(/[^a-z0-9]/gi, '_') : 'image';
    link.download = `nano-banana-${slug}-${id}.png`;
    link.click();
  };

  return (
    <>
    <NodeResizer color="#3b82f6" isVisible={selected} minWidth={200} minHeight={200} />
    <div className={`relative group rounded-2xl overflow-hidden bg-black border-2 transition-all duration-300 w-[320px] h-full shadow-2xl ${selected ? 'border-accent shadow-accent/20' : 'border-zinc-800'}`}>
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-3 !h-3 !border-4 !border-black" />
      
      {data.config && !isEditing && (
         <div className="absolute top-0 left-0 right-0 p-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start pointer-events-none">
            <div className="flex gap-1">
               <span className="px-1.5 py-0.5 rounded bg-black/50 backdrop-blur text-[9px] text-white border border-white/10 uppercase">{data.config.aspectRatio}</span>
               {modelLabel !== 'Nano Flash' && <span className={`px-1.5 py-0.5 rounded ${badgeColor}/20 text-white border ${badgeColor}/30 text-[9px] uppercase`}>{modelLabel}</span>}
            </div>
            
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    if(data.imageUrl && data.prompt && data.onAddToClipboard) {
                        data.onAddToClipboard(data.imageUrl, data.prompt, id);
                    }
                }}
                className="pointer-events-auto p-1.5 rounded-full bg-black/50 hover:bg-pink-500/50 hover:text-white text-zinc-300 border border-white/10 transition-colors"
                title="Add to Clipboard"
            >
                <Heart className="w-3.5 h-3.5" />
            </button>
         </div>
      )}

      <div 
        className={`relative w-full h-full bg-zinc-900 flex items-center justify-center min-h-[200px]`}
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
                    <img src={data.imageUrl} alt="Generated" className={`w-full h-full object-contain ${!isEditing ? 'cursor-zoom-in' : ''}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 pointer-events-none">
                        <p className="text-white text-xs line-clamp-3 mb-3 font-light">{data.prompt}</p>
                        <div className="flex items-center gap-2 pointer-events-auto">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDownload();
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
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-zinc-950/80 border-t border-zinc-800 flex justify-between items-center backdrop-blur-sm">
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

    {lightboxOpen && data.imageUrl && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200">
           <button 
             onClick={() => setLightboxOpen(false)} 
             className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50"
           >
              <X className="w-6 h-6" />
           </button>

           <div className="w-full h-full p-8 flex flex-col items-center justify-center relative">
              <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden">
                 <img 
                    src={data.imageUrl} 
                    alt="Lightbox View" 
                    className="max-w-full max-h-full object-contain drop-shadow-2xl" 
                 />
              </div>

              {/* Enhanced Footer with full prompt visibility */}
              <div className="mt-4 w-full max-w-4xl flex flex-col items-center gap-4 shrink-0 bg-zinc-900/50 p-4 rounded-xl border border-white/10 backdrop-blur">
                 <div className="max-h-[100px] overflow-y-auto w-full custom-scrollbar">
                    <p className="text-sm text-zinc-300 text-center">{data.prompt}</p>
                 </div>
                 
                 <div className="h-px w-full bg-white/10"></div>
                 
                 <div className="flex gap-4">
                     <button 
                        onClick={handleDownload}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-full flex items-center gap-2 transition-colors border border-white/10"
                     >
                        <Download className="w-4 h-4" /> Download
                     </button>
                     <button 
                        onClick={() => {
                            data.onAddVariation && data.onAddVariation(id);
                            setLightboxOpen(false);
                        }}
                        className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-full flex items-center gap-2 transition-colors border border-white/10"
                     >
                        <GitBranch className="w-4 h-4" />
                        Variations
                     </button>
                 </div>
              </div>
           </div>
        </div>,
        document.body
    )}
    </>
  );
};