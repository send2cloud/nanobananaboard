import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { Maximize2, X, ChevronLeft, ChevronRight, GitBranch, Download } from 'lucide-react';
import { GridNodeData } from '../../types';

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
      <NodeResizer color="#3b82f6" isVisible={selected} minWidth={300} minHeight={300} />
      
      <div className={`relative w-full h-full bg-surface/50 backdrop-blur-sm rounded-2xl border-2 overflow-hidden flex flex-col ${selected ? 'border-accent shadow-accent/20' : 'border-zinc-800'}`}>
        <div className="px-4 py-2 bg-zinc-900/80 border-b border-border flex items-center justify-between shrink-0">
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                 {data.config?.category} Variations
              </span>
           </div>
           <span className="text-[10px] text-zinc-500">{data.images.length} images</span>
        </div>

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

      {lightboxOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200">
           <button onClick={closeLightbox} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50">
              <X className="w-6 h-6" />
           </button>

           <div className="w-full h-full p-8 flex flex-col items-center justify-center relative">
              <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden relative">
                 <img 
                    src={currentImage.url} 
                    alt="Lightbox View" 
                    className="max-w-full max-h-full object-contain drop-shadow-2xl" 
                 />
                 <button onClick={prevImage} className="absolute left-4 md:left-10 p-4 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white transition-colors backdrop-blur-md">
                    <ChevronLeft className="w-8 h-8" />
                 </button>
                 <button onClick={nextImage} className="absolute right-4 md:right-10 p-4 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white transition-colors backdrop-blur-md">
                    <ChevronRight className="w-8 h-8" />
                 </button>
              </div>

              {/* Improved Footer with full prompt */}
              <div className="mt-4 w-full max-w-4xl flex flex-col items-center gap-4 shrink-0 bg-zinc-900/50 p-6 rounded-xl border border-white/10 backdrop-blur z-50">
                 <div className="max-h-[100px] overflow-y-auto w-full custom-scrollbar text-center">
                     <p className="text-sm text-zinc-300 font-medium leading-relaxed">{currentImage.prompt}</p>
                     <p className="text-xs text-zinc-500 text-center mt-1 font-mono">{lightboxIndex + 1} / {data.images.length}</p>
                 </div>

                 <div className="h-px w-full bg-white/10"></div>

                 <div className="flex gap-4">
                    <button 
                        onClick={() => {
                            const link = document.createElement('a');
                            link.href = currentImage.url;
                            link.download = `nano-banana-grid-${lightboxIndex}.png`;
                            link.click();
                        }}
                        className="px-6 py-3 bg-white text-black text-sm font-bold rounded-full flex items-center gap-2 hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
                    >
                        <Download className="w-5 h-5" /> Download Image
                    </button>

                    <button 
                        onClick={() => {
                        data.onBranch(currentImage.url, currentImage.prompt, id);
                        closeLightbox();
                        }}
                        className="px-6 py-3 bg-accent hover:bg-blue-600 text-white font-bold rounded-full flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <GitBranch className="w-5 h-5" />
                        Continue Story
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