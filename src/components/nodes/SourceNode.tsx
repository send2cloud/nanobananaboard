import React, { useState, useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { Wand2, Loader2, Settings2, ChevronDown, ChevronUp, Box, Upload, RefreshCw } from 'lucide-react';
import { SourceNodeData, MODEL_OPTIONS, ASPECT_RATIOS, STYLES, GenerationConfig, Provider } from '../../types';
import { NodeWrapper } from '../ui/NodeWrapper';

export const SourceNode: React.FC<NodeProps<SourceNodeData>> = ({ id, data, selected }) => {
  const [prompt, setPrompt] = useState('');
  
  // Configuration State
  const [model, setModel] = useState(MODEL_OPTIONS.FLASH);
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS.find(r => r.value === '16:9')?.value || '16:9');
  const [style, setStyle] = useState(STYLES[0].value);

  const [showConfig, setShowConfig] = useState(true);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGoogle = !data.provider || data.provider === Provider.GOOGLE;

  const handleGenerate = () => {
    if (!prompt.trim() && !data.inputImage) return;
    
    const config: GenerationConfig = {
      model: isGoogle ? model : (data.globalModel || 'External'),
      aspectRatio,
      style,
      prompt: prompt || "Variation of input image",
    };
    
    data.onGenerate(config, data.inputImage);
  };

  const handleMagicEnhance = async () => {
    if (!prompt.trim() || !data.onEnhancePrompt) return;
    setIsEnhancing(true);
    try {
        const config: GenerationConfig = {
            model: isGoogle ? model : (data.globalModel || 'External'),
            aspectRatio,
            style,
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
         // Only set the image, do not auto-generate
         if (data.onSetInputImage) {
             data.onSetInputImage(id, reader.result as string);
         } else {
             // Fallback to auto-gen if handler is missing (legacy)
             const config: GenerationConfig = {
                model: isGoogle ? model : (data.globalModel || 'External'),
                aspectRatio, 
                style: 'Varied',
                prompt: 'Refined Upload',
             };
             data.onGenerate(config, reader.result as string);
         }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <NodeWrapper selected={selected} title="Refiner (Source)" width="w-[400px]">
      <NodeResizer color="#a855f7" isVisible={selected} minWidth={300} minHeight={200} />
      
      {/* Input Image Preview */}
      <div className="mb-4 bg-black/50 rounded-lg border border-zinc-800 overflow-hidden relative group">
          {data.inputImage ? (
              <>
                <img src={data.inputImage} alt="Source" className="w-full h-40 object-contain" />
                <div 
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <span className="text-xs text-white font-medium flex items-center gap-2"><Upload className="w-3 h-3"/> Change Image</span>
                </div>
              </>
          ) : (
             <div 
                className="h-32 flex flex-col items-center justify-center text-zinc-500 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
             >
                <Upload className="w-6 h-6 mb-2" />
                <span className="text-xs">Connect node or Upload Image</span>
             </div>
          )}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
      </div>

      <div className="space-y-4">
          <div className="relative">
              <textarea
                className={`w-full bg-zinc-950 border border-border rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none h-24 pr-8 custom-scrollbar ${isEnhancing ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder="Describe how to refine this image..."
                value={prompt}
                disabled={isEnhancing}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button 
                  onClick={handleMagicEnhance}
                  disabled={!prompt.trim() || isEnhancing || !data.onEnhancePrompt}
                  className="absolute bottom-3 right-3 p-1.5 rounded-md text-zinc-500 hover:text-indigo-400 hover:bg-zinc-900 transition-all disabled:opacity-30 disabled:hover:text-zinc-500"
                  title="Enhance Prompt"
              >
                  {isEnhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              </button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden bg-zinc-900/30">
            <button 
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                 <Settings2 className="w-3.5 h-3.5" />
                 <span>Refinement Settings</span>
              </div>
              {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showConfig && (
              <div className="p-3 border-t border-border space-y-4 animate-in slide-in-from-top-1 duration-200">
                 <div>
                    <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1.5 block">Model</label>
                    {isGoogle ? (
                        <select 
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className="w-full bg-zinc-950 border border-border rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
                        >
                          <option value={MODEL_OPTIONS.FLASH}>Gemini 2.5 Flash</option>
                          <option value={MODEL_OPTIONS.PRO}>Gemini 3 Pro</option>
                        </select>
                    ) : (
                        <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-400 flex items-center gap-2 cursor-not-allowed">
                             <Box className="w-3 h-3" />
                             <span className="truncate">{data.globalModel || 'Using Global Setting'}</span>
                        </div>
                    )}
                 </div>

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

                 <div>
                   <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1.5 block">Style</label>
                   <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-zinc-950 border-border rounded p-1 text-xs text-zinc-400 outline-none">
                       {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                   </select>
                 </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={data.loading || (!prompt && !data.inputImage)}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20"
          >
            {data.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refine Image
          </button>
      </div>

      <Handle type="target" position={Position.Left} className="!bg-purple-500 !w-3 !h-3 !border-4 !border-surface" />
      <Handle type="source" position={Position.Right} className="!bg-purple-500 !w-3 !h-3 !border-4 !border-surface" />
    </NodeWrapper>
  );
};