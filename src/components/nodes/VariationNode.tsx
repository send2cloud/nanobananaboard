import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { Camera, BookOpen, Trees, Palette, Loader2, Sparkles, Play } from 'lucide-react';
import { VariationNodeData, VariationCategory } from '../../types';
import { NodeWrapper } from '../ui/NodeWrapper';

const CATEGORIES = [
  { id: VariationCategory.CAMERA, icon: Camera, label: 'Camera' },
  { id: VariationCategory.NARRATIVE, icon: BookOpen, label: 'Story' },
  { id: VariationCategory.ENVIRONMENT, icon: Trees, label: 'Env' },
  { id: VariationCategory.STYLE, icon: Palette, label: 'Style' },
];

export const VariationNode: React.FC<NodeProps<VariationNodeData>> = ({ id, data, selected }) => {
  const [category, setCategory] = useState<VariationCategory>(VariationCategory.CAMERA);
  const [count, setCount] = useState(4); 
  const [prompts, setPrompts] = useState<string[]>(Array(4).fill(''));
  const [isSuggesting, setIsSuggesting] = useState(false);

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
      <NodeResizer 
         color="#3b82f6" 
         isVisible={selected} 
         minWidth={300} 
         minHeight={300}
         handleStyle={{ width: 12, height: 12, borderRadius: 3 }} 
      />
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-3 !h-3 !border-4 !border-surface" />
      
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