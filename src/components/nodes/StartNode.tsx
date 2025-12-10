import React, { useState, useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { Upload, Wand2, Loader2, Settings2, ChevronDown, ChevronUp, Box, Server } from 'lucide-react';
import { StartNodeData, MODEL_OPTIONS, ASPECT_RATIOS, STYLES, SHOT_TYPES, CAMERA_ANGLES, LIGHTING_OPTS, GenerationConfig, Provider } from '../../types';
import { NodeWrapper } from '../ui/NodeWrapper';

export const StartNode: React.FC<NodeProps<StartNodeData>> = ({ data, selected }) => {
  const [prompt, setPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'upload'>('text');
  
  const [model, setModel] = useState(MODEL_OPTIONS.FLASH);
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
      model: isGoogle ? model : (data.globalModel || 'External'),
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
      <NodeResizer color="#3b82f6" isVisible={selected} minWidth={300} minHeight={200} />
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