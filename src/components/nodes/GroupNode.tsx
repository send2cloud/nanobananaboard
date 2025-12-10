import React from 'react';
import { NodeProps, NodeResizer } from 'reactflow';
import { FolderClosed, FolderOpen, Unlink, ChevronDown, ChevronUp } from 'lucide-react';
import { GroupNodeData } from '../../types';

export const GroupNode: React.FC<NodeProps<GroupNodeData>> = ({ id, data, selected }) => {
  const isCollapsed = data.isCollapsed;

  return (
    <>
      {!isCollapsed && (
        <NodeResizer color="#3b82f6" isVisible={selected} minWidth={200} minHeight={100} />
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